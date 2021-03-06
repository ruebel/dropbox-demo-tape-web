import React, { Fragment, useState } from "react";
import styled from "styled-components";

import { HOME } from "../constants";
import Button from "../Button";
import ButtonLink from "../ButtonLink";
import ConfirmationButton from "../ConfirmationButton";
import Loader from "../Loader";
import PlaylistHeader from "../PlaylistHeader";
import PlaylistImage from "../PlaylistImage";
import TextInput from "../TextInput";
import TrackList from "./TrackList";

import { useAudio } from "../audioContext";
import usePlaylist from "../usePlaylist";
import useSize from "../useSize";

const Actions = styled.div`
  align-items: center;
  display: grid;
  grid-auto-flow: column;
  grid-gap: 20px;
`;

const Add = styled.div`
  align-items: center;
  display: grid;
  grid-template-columns: 110px auto;
  justify-content: ${(p) =>
    p.size === "small" ? "space-between" : "flex-start"};
  padding: 20px;
`;

const Header = styled.div`
  align-items: ${(p) => (p.isEditing ? "flex-start" : "center")};
  display: grid;
  grid-gap: ${(p) => (p.isEditing ? 40 : 20)}px;
  grid-template-columns: ${(p) => (p.size === "small" ? "1fr" : "1fr auto")};
  padding: 20px;
`;

const ImageEdit = styled.div`
  align-items: center;
  display: grid;
  grid-gap: 20px;
  grid-template-columns: 50px 1fr;
`;

const Inputs = styled.div`
  display: grid;
  grid-gap: 20px;
`;

function Playlist({ navigate, playlistId }) {
  const { data, isLoading, onDelete, onSave, users } = usePlaylist({
    playlistId,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [playlist, setPlaylist] = useState(data);
  const audio = useAudio();
  const size = useSize();

  function handleCancelEdit() {
    setIsDirty(false);
    setIsEditing(false);
    setPlaylist(data);
  }

  async function handleDelete() {
    await onDelete(playlist);
    navigate(HOME);
  }

  function handleTrackChange(tracks) {
    setPlaylist({
      ...playlist,
      data: {
        ...playlist.data,
        tracks,
      },
    });
    setIsDirty(true);
  }

  function handleToggleEdit() {
    if (isEditing) {
      if (isDirty) {
        onSave(playlist);
      }
      setIsDirty(false);
      setIsEditing(false);
    } else {
      setIsEditing(true);
      setPlaylist(data);
    }
  }

  function handleArtistChange(artist) {
    setPlaylist({
      ...playlist,
      data: {
        ...playlist.data,
        artist,
      },
    });
    setIsDirty(true);
  }

  function handleTitleChange(title) {
    setPlaylist({
      ...playlist,
      data: {
        ...playlist.data,
        title,
      },
    });
    setIsDirty(true);
  }

  function handleTrackClick(track) {
    audio.onPlay({ playlistId, trackId: track.id });
  }

  return (
    <div>
      {isEditing ? (
        <Header isEditing={isEditing} size={size}>
          <Inputs>
            <ImageEdit>
              <PlaylistImage playlist={playlist} />
              <ButtonLink to="image">Edit Image</ButtonLink>
            </ImageEdit>
            <TextInput
              onChange={handleTitleChange}
              title="Title"
              value={playlist.data.title}
            />
            <TextInput
              onChange={handleArtistChange}
              title="Artist"
              value={playlist.data.artist || ""}
            />
          </Inputs>
          <Actions>
            <Fragment>
              <Button disabled={!isDirty} onClick={handleToggleEdit}>
                Save
              </Button>
              <Button onClick={handleCancelEdit}>Cancel</Button>
            </Fragment>
          </Actions>
        </Header>
      ) : (
        <Header isEditing={isEditing} size={size}>
          <PlaylistHeader playlist={playlist} />
          <Actions>
            <Button onClick={handleToggleEdit}>Edit</Button>
            <ConfirmationButton message="Really Delete?" onClick={handleDelete}>
              Delete
            </ConfirmationButton>
          </Actions>
        </Header>
      )}
      {isEditing && (
        <Add size={size}>
          <h2>Tracks</h2>
          <ButtonLink to="tracks">Add Tracks</ButtonLink>
        </Add>
      )}
      <Loader isLoading={isLoading} />
      <TrackList
        isEditing={isEditing}
        onTrackChange={handleTrackChange}
        onTrackClick={handleTrackClick}
        playingId={audio.track?.id}
        tracks={playlist.data.tracks}
        users={users}
      />
    </div>
  );
}

export default Playlist;
