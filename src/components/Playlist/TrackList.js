import React from "react";
import styled from "styled-components";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DragIndicator from "@material-ui/icons/DragIndicator";

import List from "../List";
import Track from "./Track";

import { getModifiedBy, reorderList } from "../../utils";

const DragHandle = styled.div`
  align-items: center;
  color: ${(p) => p.theme.color.primary};
  display: flex;
  height: 100%;
  justify-content: center;
  position: absolute;
  right: 10px;
  top: 0;
`;

const TrackWrapper = styled.div`
  position: relative;
`;

function trackListPropsAreEqual(prev, next) {
  return (
    prev.playingId === next.playingId &&
    prev.tracks.map((t) => t.id).join() === next.tracks.map((t) => t.id).join()
  );
}

const EditableTrackList = React.memo(function EditableTrackList({
  onTrackClick,
  onTrackDelete,
  playingId,
  tracks,
}) {
  return (
    <List
      getKey={(t) => t.id}
      items={tracks}
      itemRenderer={(track, index) => (
        <Draggable draggableId={track.id} index={index}>
          {(provided) => (
            <TrackWrapper ref={provided.innerRef} {...provided.draggableProps}>
              <Track
                index={index + 1}
                isEditable={true}
                isPlaying={playingId === track.id}
                onClick={onTrackClick}
                onDelete={onTrackDelete}
                track={track}
              />
              <DragHandle {...provided.dragHandleProps}>
                <DragIndicator />
              </DragHandle>
            </TrackWrapper>
          )}
        </Draggable>
      )}
    />
  );
},
trackListPropsAreEqual);

function TrackList({
  isEditing,
  onTrackChange,
  onTrackClick,
  onTrackDelete,
  playingId,
  tracks,
  users,
}) {
  function handleSort(result) {
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

  function handleDelete(track) {
    onTrackChange(tracks.filter((t) => t.id !== track.id));
  }

  return isEditing ? (
    <DragDropContext onDragEnd={handleSort}>
      <Droppable droppableId="tracks">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <EditableTrackList
              onTrackClick={onTrackClick}
              onTrackDelete={handleDelete}
              playingId={playingId}
              tracks={tracks}
            />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  ) : (
    <List
      getKey={(t) => t.id}
      items={tracks}
      itemRenderer={(track, index) => (
        <Track
          index={index + 1}
          isPlaying={playingId === track.id}
          onClick={onTrackClick}
          track={track}
          user={users[getModifiedBy(track)]}
        />
      )}
    />
  );
}

export default TrackList;
