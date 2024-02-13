import styles from "./volume.module.css";
import { useAtom } from "jotai";
import { isMutedAtom, volumeAtom } from "@/state/audio";
import { MuteIcon } from "@/components/icons/MuteIcon";
import { VolumeIcon } from "@/components/icons/VolumeIcon";
import { IconButton } from "@/components/IconButton/IconButton";

export function Volume() {
  const [isMuted, setIsMuted] = useAtom(isMutedAtom);
  const [volume, setVolume] = useAtom(volumeAtom);

  const Icon = volume === 0 || isMuted ? MuteIcon : VolumeIcon;

  return (
    <div className={styles.volume}>
      <IconButton
        ariaLabel="volume"
        isSimple={true}
        onClick={() => setIsMuted(!isMuted)}
      >
        <Icon size={20} />
      </IconButton>
      <input
        max={1}
        min={0}
        onChange={(e) => setVolume(Number(e.currentTarget.value))}
        step={0.01}
        type="range"
        value={isMuted ? 0 : volume}
      />
    </div>
  );
}
