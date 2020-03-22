import React, { Fragment } from "react";
import styled from "styled-components";
import ChevronRight from "@material-ui/icons/ChevronRight";

import Breadcrumb from "./Breadcrumb";

const Trail = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding-left: 10px;
`;

function BreadcrumbTrail({ onClick, onSort, path = "" }) {
  const trail = path.split("/").map((folder, i, pathArray) => {
    const subPath = pathArray.slice(0, i + 1).join("/");
    return (
      <Fragment key={i}>
        {i !== 0 && <span>/</span>}
        <Breadcrumb name={folder || "Home"} onClick={onClick} path={subPath} />
      </Fragment>
    );
  });

  return (
    <Trail>
      <ChevronRight /> {trail}
    </Trail>
  );
}

export default BreadcrumbTrail;
