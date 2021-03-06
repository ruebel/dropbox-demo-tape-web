import React from "react";

import useSize from "../../useSize";

import DesktopPlayer from './DesktopPlayer';
import MobilePlayer from './MobilePlayer';

function Player() {
  const size = useSize();

  const isSmall = size === "small";

  return isSmall ? <MobilePlayer /> : <DesktopPlayer />  
}

export default Player;
