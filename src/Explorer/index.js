import React, { useState } from "react";
import styled from "styled-components";

import BreadcrumbTrail from "./BreadcrumbTrail";
import Entry from "./Entry";
import List from "../List";
import Loader from "../Loader";
import SortableHeader from "./SortableHeader";
import Spacer from "../Spacer";
import useFiles from "./useFiles";

const Header = styled.div`
  display: grid;
  grid-gap: 20px;
  grid-template-columns: 20px 1fr 0.5fr 0.5fr;
  padding: 0 20px;
`;

const Wrapper = styled.div`
  display: grid;
`;

function Explorer({
  onPathChange,
  onSelectionChange,
  selectedEntries = [],
  showFiles = false
}) {
  const [folder, setFolder] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("");
  const { files, isLoading } = useFiles({ folder, showFiles, sortBy, sortDir });

  function handleClick(entry) {
    if (entry.type === "folder") {
      setFolder(entry.path);
      if (onPathChange) {
        onPathChange(entry.path);
      }
    } else if (showFiles) {
      if (selectedEntries.some(e => e.id === entry.id)) {
        onSelectionChange(selectedEntries.filter(e => e.id !== entry.id));
      } else {
        onSelectionChange([...selectedEntries, entry]);
      }
    }
  }

  function handleSort(column) {
    if (column !== sortBy) {
      setSortBy(column);
      setSortDir("desc");
    } else {
      if (sortDir === "desc") {
        setSortDir("asc");
      } else {
        setSortDir("");
        setSortBy("");
      }
    }
  }

  return (
    <Wrapper>
      <BreadcrumbTrail onClick={setFolder} path={folder} />
      <Spacer height="10px" />
      <Header>
        <span />
        <SortableHeader
          onClick={() => handleSort("name")}
          sortDir={sortBy === "name" ? sortDir : null}
        >
          Name
        </SortableHeader>
        <SortableHeader
          onClick={() => handleSort("modified")}
          sortDir={sortBy === "modified" ? sortDir : null}
        >
          Modified
        </SortableHeader>
        <SortableHeader
          onClick={() => handleSort("modifiedBy")}
          sortDir={sortBy === "modifiedBy" ? sortDir : null}
        >
          Modified By
        </SortableHeader>
      </Header>
      <Loader isLoading={isLoading} />
      <List
        emptyMessage="There are no files here"
        isLoading={isLoading}
        items={files}
        itemRenderer={entry => (
          <Entry
            entry={entry}
            isSelected={selectedEntries.some(
              e => e.path_lower === entry.path_lower
            )}
            onClick={handleClick}
          />
        )}
      />
    </Wrapper>
  );
}

export default Explorer;
