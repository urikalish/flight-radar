export class Helper {
    public static to3Digits(num: number): string {
        if (num < 10) return `00${num}`;
        if (num < 100) return `0${num}`;
        return `${num}`;
    }
}
