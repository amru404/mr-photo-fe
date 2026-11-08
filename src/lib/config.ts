/** Platform name (APP_NAME on the backend). Never empty, like config('app.name'). */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Photo Studio";
