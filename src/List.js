import React from "react";
import styled from "styled-components";

const getKeyDefault = (_item, index) => index;

const EmptyMessage = styled.div`
  ${p => p.theme.typography.base}
  color: ${p => p.theme.color.secondary};
  font-size: 18px;
  padding: 20px;
`;

const gapStyle = gap =>
  gap
    ? `
        display: grid;
        grid-gap: ${gap}px;
      `
    : "";

const StyledList = styled.ul`
  liststyletype: none;
  margin: 0;
  marginblockend: 0;
  marginblockstart: 0;
  padding: 0;
  paddinginlinestart: 0;
  webkitmarginafter: 0;
  webkitmarginbefore: 0;
  webkitpaddingstart: 0;
  ${p => gapStyle(p.gap)}
`;

function List({
  emptyMessage,
  isLoading,
  itemRenderer,
  items,
  gap,
  getKey = getKeyDefault
}) {
  if (!isLoading && items.length === 0 && emptyMessage) {
    return <EmptyMessage>{emptyMessage}</EmptyMessage>;
  }

  const listItems = items.map((item, i) => (
    <li key={getKey(item, i)}>{itemRenderer(item, i)}</li>
  ));

  return <StyledList gap={gap}>{listItems}</StyledList>;
}

List.defaultProps = {
  getKey: getKeyDefault
};

export default List;
