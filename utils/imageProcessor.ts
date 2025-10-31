// This utility provides functions for client-side image manipulation.

/**
 * Composes a base image with a frame image on top using the Canvas API.
 * Both images are expected to be square (1024x1024).
 * @param baseImageSrc The base64 data URL of the AI-generated image.
 * @param frameImageSrc The base64 data URL of the frame asset (with transparency).
 * @returns A promise that resolves with the base64 data URL of the composed image.
 */
export const composeWithFrame = (baseImageSrc: string, frameImageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        // Standard size for generated images
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return reject(new Error('Could not get 2D canvas context.'));
        }

        const baseImage = new Image();
        baseImage.onload = () => {
            // Draw the AI-generated image as the background
            ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

            const frameImage = new Image();
            frameImage.onload = () => {
                // Overlay the frame on top
                ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
                // Resolve with the final composed image data URL
                resolve(canvas.toDataURL('image/png'));
            };
            frameImage.onerror = (err) => reject(new Error(`Failed to load frame image: ${err}`));
            frameImage.src = frameImageSrc;
        };
        baseImage.onerror = (err) => reject(new Error(`Failed to load base image: ${err}`));
        baseImage.src = baseImageSrc;
    });
};
