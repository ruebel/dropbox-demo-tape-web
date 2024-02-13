import { ImageMap } from "@/utils/types";
import { atomWithStorage } from "jotai/utils";

export const imageMapAtom = atomWithStorage<ImageMap>("playlistImages", {});
