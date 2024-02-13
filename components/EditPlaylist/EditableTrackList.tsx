import { List } from "@/components/List/List";
import { PlaylistTrack } from "@/utils/types";
import {
  DragDropContext,
  Draggable,
  DropResult,
  Droppable,
} from "@hello-pangea/dnd";
import { memo } from "react";

import { EditableTrack } from "@/components/EditPlaylist/EditableTrack";
import { DragHandleIcon } from "@/components/icons/DragHandleIcon";
import { reorderList } from "@/utils/list";
import styles from "./editableTrackList.module.css";

type EditableTrackListProps = {
  onTrackChange: (tracks: PlaylistTrack[]) => void;
  tracks: PlaylistTrack[];
};

type TrackListProps = {
  onTrackDelete: (id: string) => void;
  tracks: PlaylistTrack[];
};

const TrackList = memo(function EditableTrackList({ onTrackDelete, tracks }) {
  return (
    <List
      getKey={(t) => t.id}
      items={tracks}
      itemRenderer={(track, index) => (
        <Draggable draggableId={track.id} index={index}>
          {(provided) => (
            <div
              className={styles.trackWrapper}
              ref={provided.innerRef}
              {...provided.draggableProps}
            >
              <EditableTrack
                index={index + 1}
                onDelete={onTrackDelete}
                track={track}
              />
              <div className={styles.dragHandle} {...provided.dragHandleProps}>
                <DragHandleIcon size={30} />
              </div>
            </div>
          )}
        </Draggable>
      )}
    />
  );
}, trackListPropsAreEqual);

export function EditableTrackList({
  onTrackChange,
  tracks,
}: EditableTrackListProps) {
  function handleSort(result: DropResult) {
    if (
      !result.destination ||
      result.destination.index === result.source.index
    ) {
      return;
    }

    const reordered = reorderList(
      tracks,
      result.source.index,
      result.destination.index
    );

    onTrackChange(reordered);
  }

  function handleDelete(id: string) {
    onTrackChange(tracks.filter((t) => t.id !== id));
  }

  return (
    <DragDropContext onDragEnd={handleSort}>
      <Droppable droppableId="tracks">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <TrackList onTrackDelete={handleDelete} tracks={tracks} />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

function trackListPropsAreEqual(prev: TrackListProps, next: TrackListProps) {
  return (
    prev.tracks.map((t) => t.id).join() === next.tracks.map((t) => t.id).join()
  );
}
