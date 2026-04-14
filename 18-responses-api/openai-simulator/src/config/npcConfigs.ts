import type { CharacterConfig } from '../gameobjects/Character';
import { samAgent, wendyAgent } from './characters';

export type NpcConfig = Omit<
    CharacterConfig,
    'scene' | 'colliders' | 'frameConfig' | 'npc' | 'sprite'
>;

export const nonInteractiveNPCs: NpcConfig[] = [
    {
        texture: 'misc_1',
        position: { x: 2229, y: 1265 },
        initialDirection: 'up',
    },
    {
        texture: 'misc_2',
        position: { x: 2660, y: 1265 },
        initialDirection: 'up',
    },
    {
        texture: 'misc_3',
        position: { x: 2509, y: 1062 },
        initialDirection: 'down',
    },
    {
        texture: 'misc_4',
        position: { x: 2502, y: 784 },
        initialDirection: 'right',
    },
    {
        texture: 'misc_7',
        position: { x: 2502, y: 656 },
        initialDirection: 'right',
    },
    // desks row 1
    {
        texture: 'misc_5',
        position: { x: 49 * 48 + 24, y: 5 * 48 },
        initialDirection: 'down',
    },
    {
        texture: 'misc_6',
        position: { x: 55 * 48 + 24, y: 5 * 48 },
        initialDirection: 'down',
    },
    // desks row 2
    {
        texture: 'misc_7',
        position: { x: 46 * 48 + 24, y: 9 * 48 },
        initialDirection: 'up',
    },
    {
        texture: 'misc_1',
        position: { x: 52 * 48 + 24, y: 9 * 48 },
        initialDirection: 'up',
    },
    // Conference room
    {
        texture: 'misc_2',
        position: { x: 1655, y: 674 },
        initialDirection: 'up',
    },
    {
        texture: 'misc_3',
        position: { x: 1741, y: 580 },
        initialDirection: 'left',
    },
    {
        texture: 'misc_4',
        position: { x: 1741, y: 635 },
        initialDirection: 'left',
    },
    {
        texture: 'misc_5',
        position: { x: 1564, y: 580 },
        initialDirection: 'right',
    },
    {
        texture: 'misc_6',
        position: { x: 1564, y: 635 },
        initialDirection: 'right',
    },
];

const wendy: NpcConfig = {
    texture: 'wendy',
    position: { x: 458, y: 893 },
    initialDirection: 'down',
    speed: 130,
    dialogueAgent: wendyAgent,
};

const sam: NpcConfig = {
    texture: 'sam',
    position: { x: 707, y: 485 },
    initialDirection: 'left',
    speed: 130,
    dialogueAgent: samAgent,
};

export const npcConfigs: NpcConfig[] = [...nonInteractiveNPCs, wendy, sam];
