import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
    private prompt!: Phaser.GameObjects.Text;
    private enterKey!: Phaser.Input.Keyboard.Key;
    private hasStarted = false;

    constructor() {
        super({ key: 'StartScene' });
    }

    create(): void {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);

        this.add
            .text(width / 2, height / 2 - 80, 'OpenAI Simulator', {
                fontFamily: '"Abaddon Bold", sans-serif',
                fontSize: '96px',
                color: '#ffffff',
                stroke: '#0c0a1a',
                strokeThickness: 8,
                align: 'center',
            })
            .setOrigin(0.5)
            .setShadow(6, 6, '#000000', 4, true, true);

        this.prompt = this.add
            .text(width / 2, height / 2 + 40, 'press ENTER or click to start', {
                fontFamily: '"Abaddon Light", sans-serif',
                fontSize: '32px',
                color: '#00ff9d',
                align: 'center',
            })
            .setOrigin(0.5);

        this.tweens.add({
            targets: this.prompt,
            alpha: { from: 1, to: 0.2 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        const keyboard = this.input.keyboard;

        if (!keyboard) {
            throw new Error('Keyboard input plugin is not available.');
        }

        this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        keyboard.on('keydown-ENTER', this.handleStart, this);
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleStart, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            keyboard.off('keydown-ENTER', this.handleStart, this);
            this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleStart, this);
        });
    }

    update(): void {
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.startGame();
        }
    }

    private handleStart(): void {
        this.startGame();
    }

    private startGame(): void {
        if (this.hasStarted) {
            return;
        }

        this.hasStarted = true;
        this.scene.start('MainScene');
    }
}
