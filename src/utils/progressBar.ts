/**
 * Progress Bar Module
 * 
 * Provides utilities for displaying progress indicators in the CLI
 */
import colors from './colors';

// Animation frames for the animated loading indicator
const loadingFrames = ['⠋', '⠙', '⠸', '⠴', '⠦', '⠇'];
const dotFrames = [' ', '.', '..', '...'];

/**
 * Creates a loading indicator with animated dots
 * @param text Text to display with the loading indicator
 * @returns Object with update and stop methods
 */
export function createLoadingIndicator(text: string = 'Loading') {
    let frameIndex = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    let active = true;
    const maxLength = 100; // Maximum length of the line to avoid wrapping
    
    // Print initial state
    process.stdout.write(`${colors.blue(text)} ${dotFrames[0]}`);
    
    // Start animation
    interval = setInterval(() => {
        if (!active) return;
        
        // Clear the current line
        process.stdout.write('\r');
        process.stdout.clearLine(0);
        
        // Update frame index
        frameIndex = (frameIndex + 1) % dotFrames.length;
        
        // Display indicator
        process.stdout.write(`${colors.blue(text)} ${dotFrames[frameIndex]}`);
    }, 250);
    
    return {
        /**
         * Updates the loading text
         * @param newText New text to display
         */
        updateText: (newText: string) => {
            if (!active) return;
            
            text = newText;
            // Clear the current line
            process.stdout.write('\r');
            process.stdout.clearLine(0);
            
            // Display updated indicator
            process.stdout.write(`${colors.blue(text)} ${dotFrames[frameIndex]}`);
        },
        
        /**
         * Stops the loading indicator and cleans up
         * @param finalText Optional text to display when stopping
         * @param success Whether the operation was successful
         */
        stop: (finalText?: string, success: boolean = true) => {
            if (!active) return;
            
            // Stop the interval
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            
            // Clear the line
            process.stdout.write('\r');
            process.stdout.clearLine(0);
            
            // If final text provided, print it with success/error color
            if (finalText) {
                const color = success ? colors.green : colors.red;
                process.stdout.write(`${color(finalText)}\n`);
            }
            
            active = false;
        }
    };
}

/**
 * Creates a progress bar
 * @param total Total number of items
 * @param label Label for the progress bar
 * @returns Object with update and stop methods
 */
export function createProgressBar(total: number, label: string = 'Processing') {
    let current = 0;
    let active = true;
    let animFrameIndex = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    let lastLogLine = '';
    
    // Start animation for the spinner
    interval = setInterval(() => {
        if (!active) return;
        
        // Update animation frame
        animFrameIndex = (animFrameIndex + 1) % loadingFrames.length;
        
        // Redraw progress indicator
        drawProgress();
    }, 100);
    
    // Initial draw
    drawProgress();
    
    function drawProgress() {
        // Calculate percentage
        const percent = Math.floor((current / total) * 100);
        
        // Create the progress bar components
        const spinner = loadingFrames[animFrameIndex];
        
        // Make progress bar more distinguishable with square brackets
        const progressText = `[${colors.blue(label)} ${current}/${total} ${spinner} ${percent}%]`;
        
        // Clear the current line
        process.stdout.write('\r');
        process.stdout.clearLine(0);
        
        // Display the progress indicator
        process.stdout.write(progressText);
    }
    
    return {
        /**
         * Updates the progress
         * @param n New progress value
         */
        update: (n: number) => {
            if (!active) return;
            current = Math.min(n, total);
            drawProgress();
        },
        
        /**
         * Increments the progress by 1
         */
        increment: () => {
            if (!active) return;
            current = Math.min(current + 1, total);
            drawProgress();
        },
        
        /**
         * Ensures log messages appear on a new line separate from the progress bar
         * @param message Message to log
         */
        log: (message: string) => {
            // Save current progress line state
            const savedCurrent = current;
            lastLogLine = message;
            
            // Print log on new line
            process.stdout.write('\n');
            console.log(message);
            
            // Redraw progress bar
            if (active) {
                current = savedCurrent;
                drawProgress();
            }
        },
        
        /**
         * Stops the progress bar and cleans up
         * @param finalText Optional text to display when stopping
         * @param success Whether the operation was successful
         */
        stop: (finalText?: string, success: boolean = true) => {
            if (!active) return;
            
            // Stop the animation
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            
            // Clear the line
            process.stdout.write('\r');
            process.stdout.clearLine(0);
            
            // If final text provided, print it with success/error color
            if (finalText) {
                const color = success ? colors.green : colors.red;
                process.stdout.write(`${color(finalText)}\n`);
            }
            
            active = false;
        }
    };
}