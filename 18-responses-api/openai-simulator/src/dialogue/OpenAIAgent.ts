import {
    BaseDialogueAgent,
    type DialogueAgentOptions,
    type DialogueContext,
    type DialogueStreamChunk,
} from './BaseDialogueAgent';
import type {
    EasyInputMessage,
    ResponseCreateParamsBase,
    ResponseInput,
    ResponseInputItem,
    ResponseStreamEvent,
} from 'openai/resources/responses/responses';

export type OpenAIResponseRequestOptions = Omit<ResponseCreateParamsBase, 'input' | 'stream'>;

export interface OpenAIDialogueAgentOptions extends DialogueAgentOptions {
    request_options?: OpenAIResponseRequestOptions;
}

export class OpenAIDialogueAgent extends BaseDialogueAgent {
    private readonly requestOptions?: OpenAIResponseRequestOptions;

    constructor(config: OpenAIDialogueAgentOptions) {
        super(config);

        this.requestOptions = config.request_options;
    }

    protected async *provideResponseStream(
        context: DialogueContext,
    ): AsyncGenerator<DialogueStreamChunk> {
        const input = this.buildResponseInput(context);
        const params = this.requestOptions ?? {};

        restartLoop: while (true) {
            let restartRequested = false;

            try {
                for await (const event of this.openProxyStream({ request_options: params, input })) {
                    this.emitDebugEvent({ source: 'openai.responses', payload: event });

                    switch (event.type) {
                        case 'response.output_item.done': {
                            input.push(event.item as ResponseInputItem);

                            if (event.item.type === 'image_generation_call') {
                                const result = event.item.result;
                                if (result) {
                                    const newTab = window.open();
                                    newTab?.document.write(
                                        `<img src="data:image/png;base64,${result}" />`,
                                    );
                                }
                                break;
                            }

                            if (event.item.type === 'mcp_approval_request') {
                                const approved = window.confirm(`Run ${event.item.name}?`);

                                input.push({
                                    type: 'mcp_approval_response',
                                    approval_request_id: event.item.id,
                                    approve: approved,
                                });
                                restartRequested = true;
                            }

                            if (event.item.type === 'mcp_call') {
                                yield {
                                    type: 'reasoning',
                                    text: `calling ${event.item.server_label}.${event.item.name}...`,
                                };
                            }

                            break;
                        }
                        case 'response.output_text.delta':
                            yield { type: 'text', text: event.delta };
                            break;
                        case 'response.reasoning_summary_text.delta':
                        case 'response.reasoning_text.delta':
                            yield { type: 'reasoning', text: event.delta };
                            break;
                        case 'response.web_search_call.searching':
                            yield { type: 'reasoning', text: 'searching the web...' };
                            break;
                        case 'response.image_generation_call.in_progress':
                        case 'response.image_generation_call.generating':
                            yield { type: 'reasoning', text: 'generating image...' };
                            break;
                        case 'response.mcp_list_tools.in_progress':
                            yield { type: 'reasoning', text: 'listing tools...' };
                            break;
                        case 'error':
                            throw new Error(this.responseErrorMessage(event));
                        case 'response.failed':
                            throw new Error(
                                event.response.error?.message ?? 'Responses API request failed',
                            );
                        case 'response.completed':
                            break;
                    }

                    if (restartRequested) {
                        break;
                    }
                }
            } catch (error) {
                this.emitProxyError(error);
                yield {
                    type: 'text',
                    text: `Sorry, I couldn't reach my backend tools: ${this.errorMessage(error)}`,
                };
                return;
            }

            if (!restartRequested) {
                break restartLoop;
            }
        }
    }

    private buildResponseInput(context: DialogueContext): ResponseInput {
        return context.history.flatMap((entry): ResponseInputItem[] => {
            if (entry.type === 'function_call_output') {
                return [
                    {
                        type: 'function_call_output',
                        call_id: entry.callId,
                        output: entry.output,
                    },
                ];
            }

            const message: EasyInputMessage = {
                type: 'message',
                role: entry.role,
                content: entry.content,
            };

            return [message];
        });
    }

    private async *openProxyStream(payload: {
        request_options: OpenAIResponseRequestOptions;
        input: ResponseInput;
    }): AsyncGenerator<ResponseStreamEvent> {
        const response = await fetch('/api/responses/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Responses proxy returned ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Responses proxy returned an empty stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });

            let boundary = this.findEventBoundary(buffer);
            while (boundary) {
                const rawEvent = buffer.slice(0, boundary.index);
                buffer = buffer.slice(boundary.index + boundary.length);

                const event = this.parseServerSentEvent(rawEvent);
                if (event) {
                    yield event;
                }

                boundary = this.findEventBoundary(buffer);
            }

            if (done) {
                break;
            }
        }
    }

    private findEventBoundary(buffer: string): { index: number; length: number } | null {
        const unixIndex = buffer.indexOf('\n\n');
        const windowsIndex = buffer.indexOf('\r\n\r\n');

        if (unixIndex === -1 && windowsIndex === -1) {
            return null;
        }

        if (unixIndex === -1) {
            return { index: windowsIndex, length: 4 };
        }

        if (windowsIndex === -1 || unixIndex < windowsIndex) {
            return { index: unixIndex, length: 2 };
        }

        return { index: windowsIndex, length: 4 };
    }

    private parseServerSentEvent(rawEvent: string): ResponseStreamEvent | null {
        const dataLines = rawEvent
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).trimStart());

        if (dataLines.length === 0) {
            return null;
        }

        const data = dataLines.join('\n');

        if (data === '[DONE]') {
            return null;
        }

        return JSON.parse(data) as ResponseStreamEvent;
    }

    private emitProxyError(error: unknown): void {
        console.error('[DialogueAgent] Responses proxy failed:', error);
        this.emitDebugEvent({
            source: 'agent',
            payload: {
                type: 'proxy-error',
                message: this.errorMessage(error),
            },
        });
    }

    private responseErrorMessage(event: ResponseStreamEvent): string {
        const maybeEvent = event as unknown as {
            message?: unknown;
            error?: { message?: unknown };
        };

        if (typeof maybeEvent.message === 'string') {
            return maybeEvent.message;
        }

        if (typeof maybeEvent.error?.message === 'string') {
            return maybeEvent.error.message;
        }

        return 'Responses API request failed';
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
