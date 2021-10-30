import React, { Fragment, useState } from "react";
import styled from "styled-components";
import Voicemail from "@material-ui/icons/Voicemail";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";

import { useDropbox } from "../../hooks";
import { HOME } from "../../constants";
import Avatar from "../Avatar";
import Link from "../Link";

const Inner = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

const Title = styled.h1`
  padding-left: 10px;
`;

const UserMenu = styled.button`
  background: transparent;
  border: none;
  margin: 0;
  outline: none;
  padding: 0;
`;

const Wrapper = styled.div`
  align-items: center;
  background-color: ${(p) => p.theme.color.backgroundLight};
  display: grid;
  grid-template-columns: auto 1fr auto;
  padding: 20px;
`;
function Header({ location }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { currentUser, onLogout } = useDropbox();

  function closeMenu() {
    setAnchorEl(null);
  }

  function handleLogout() {
    onLogout();
  }

  function showMenu(e) {
    setAnchorEl(e.currentTarget);
  }

  return (
    <Wrapper>
      <Link to={HOME}>
        <Inner>
          <Voicemail fontSize="large" />
          <Title>Demo Tape</Title>
        </Inner>
      </Link>
      <span />
      {currentUser && (
        <Fragment>
          <UserMenu
            aria-controls="user-menu"
            aria-haspopup="true"
            onClick={showMenu}
          >
            <Avatar
              initials={currentUser?.name?.abbreviated_name}
              name={currentUser?.name?.display_name}
              url={currentUser?.profile_photo_url}
            />
          </UserMenu>
          <Menu
            elevation={0}
            getContentAnchorEl={null}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
            id="user-menu"
            anchorEl={anchorEl}
            keepMounted={true}
            open={Boolean(anchorEl)}
            onClose={closeMenu}
          >
            <MenuItem onClick={() => handleLogout()}>Logout</MenuItem>
          </Menu>
        </Fragment>
      )}
    </Wrapper>
  );
}

export default Header;
