import { os } from "@orpc/server";
import { faceRouter } from "./face.js";
import { searchRouter } from "./search.js";
import { videoRouter } from "./video.js";
// Main application router combining all sub-routers
export const appRouter = os.router({
    face: faceRouter,
    search: searchRouter,
    video: videoRouter,
});
//# sourceMappingURL=index.js.map