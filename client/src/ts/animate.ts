interface InterpolatorOptions {
    ease: EaseType;
    duration: number;
    from: number;
    to: number;
}

export class Interpolator {
    public options: InterpolatorOptions;
    private startTime: number = -Infinity;
    public isVirgin = true;

    constructor(options: InterpolatorOptions) {
        this.options = options;
    }

    /**
     *
     * @param customTime A custom time parameter to override performance.now with your own timekeeping system.
     */
    start(customTime?: number) {
        this.isVirgin = false;
        let now;
        if (customTime !== undefined) now = customTime;
        else now = performance.now();

        this.startTime = now;
    }

    end() {
        this.startTime = -Infinity;
    }

    reverse() {
        let now = performance.now();

        this.options = {
            ease: this.options.ease,
            duration: this.options.duration,
            from: this.options.to,
            to: this.options.from
        };

        if (now - this.startTime > this.options.duration) {
            this.start();
            return;
        }

        // if (now - this.startTime > this.options.duration) {
        //     this.start();
        // } else if (this.startTime !== -Infinity) {
        //     this.startTime = now - (this.options.duration - this.startTime);
        // }
    }

    getCurrentValue(customTime?: number) {
        if (this.isVirgin) return this.options.from;
        let now;
        if (customTime !== undefined) now = customTime;
        else now = performance.now();

        let completion = (now - this.startTime) / this.options.duration;
        completion = clamp(completion, 0, 1);
        completion = ease(this.options.ease, completion);

        return (
            (1 - completion) * this.options.from + completion * this.options.to
        );
    }
}

const clamp = (val: number, min: number, max: number) => {
    if (val < min) {
        return min;
    } else if (val > max) {
        return max;
    }
    return val;
};

const ease = (type: EaseType, val: number) => {
    let p = 0.3; // Some shit used for elastic bounce

    switch (type) {
        /**
            Only considering the value for the range [0, 1] => [0, 1].
            The higher the power used (Quad, Cubic, Quart), the more sudden the animation will be.
        */

        case EaseType.Linear: // no easing, no acceleration
            return val;
            break;
        case EaseType.EaseInQuad: // accelerating from zero velocity
            return val * val;
            break;
        case EaseType.EaseOutQuad: // decelerating to zero velocity
            return val * (2 - val);
            break;
        case EaseType.EaseInOutQuad: // acceleration until halfway, then deceleration
            return val < 0.5 ? 2 * val * val : -1 + (4 - 2 * val) * val;
            break;
        case EaseType.EaseInCubic: // accelerating from zero velocity
            return val * val * val;
            break;
        case EaseType.EaseOutCubic: // decelerating to zero velocity
            return --val * val * val + 1;
            break;
        case EaseType.EaseInOutCubic: // acceleration until halfway, then deceleration
            return val < 0.5
                ? 4 * val * val * val
                : (val - 1) * (2 * val - 2) * (2 * val - 2) + 1;
            break;
        case EaseType.EaseInQuart: // accelerating from zero velocity
            return val * val * val * val;
            break;
        case EaseType.EaseOutQuart: // decelerating to zero velocity
            return 1 - --val * val * val * val;
            break;
        case EaseType.EaseInOutQuart: // acceleration until halfway, then deceleration
            return val < 0.5
                ? 8 * val * val * val * val
                : 1 - 8 * --val * val * val * val;
            break;
        case EaseType.EaseInQuint: // accelerating from zero velocity
            return val * val * val * val * val;
            break;
        case EaseType.EaseOutQuint: // decelerating to zero velocity
            return 1 + --val * val * val * val * val;
            break;
        case EaseType.EaseInOutQuint: // acceleration until halfway, then deceleration
            return val < 0.5
                ? 16 * val * val * val * val * val
                : 1 + 16 * --val * val * val * val * val;
            break;
        case EaseType.EaseOutElastic: // Cartoon-like elastic effect
            return (
                Math.pow(2, -10 * val) *
                    Math.sin(((val - p / 4) * (2 * Math.PI)) / p) +
                1
            );
            break;
        case EaseType.EaseInSine: // accelerating from zero velocity, using trig.
            return -1 * Math.cos(val * (Math.PI / 2)) + 1;
            break;
        case EaseType.EaseOutSine: // decelerating to zero velocity, using trig.
            return Math.sin(val * (Math.PI / 2));
            break;
        case EaseType.EaseInOutSine: // acceleration until halfway, then deceleration, using trig.
            return Math.cos(Math.PI * val) * -0.5 + 0.5;
            break;
        case EaseType.EaseInExpo: // Accelerate exponentially until finish
            return val === 0 ? 0 : Math.pow(2, 10 * (val - 1));
            break;
        case EaseType.EaseOutExpo: // Initial exponential acceleration slowing to stop
            return val === 1 ? 1 : -Math.pow(2, -10 * val) + 1;
        case EaseType.EaseInOutExpo: // Exponential acceleration and deceleration
            if (val === 0 || val === 1) return val;

            const scaledTime = val * 2;
            const scaledTime1 = scaledTime - 1;

            if (scaledTime < 1) {
                return 0.5 * Math.pow(2, 10 * scaledTime1);
            }

            return 0.5 * (-Math.pow(2, -10 * scaledTime1) + 2);
        default:
            return val;
    }
};

export enum EaseType {
    Linear,
    EaseInQuad,
    EaseOutQuad,
    EaseInOutQuad,
    EaseInCubic,
    EaseOutCubic,
    EaseInOutCubic,
    EaseInQuart,
    EaseOutQuart,
    EaseInOutQuart,
    EaseInQuint,
    EaseOutQuint,
    EaseInOutQuint,
    EaseOutElastic,
    EaseInSine,
    EaseOutSine,
    EaseInOutSine,
    EaseInExpo,
    EaseOutExpo,
    EaseInOutExpo
}
