declare module '*.png'{
    const value: string;
    export default value;
}
declare module 'stats-js'{
    export default class Stats{
        dom: HTMLElement;
        showPanel(panel: number): void;
        begin(): void;
        end(): void;
    }
}