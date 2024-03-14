import { Breadcrumb } from "@/components/Explorer/Breadcrumb";
import { ChevronRightIcon } from "@/components/icons/ChevronRightIcon";
import { Fragment } from "react";

import styles from "./explorer.module.css";

type BreadcrumbTrailProps = {
  onClick: (path: string) => void;
  path?: string;
};

export function BreadcrumbTrail({ onClick, path = "" }: BreadcrumbTrailProps) {
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
    <div className={styles.breadcrumbTrail}>
      <ChevronRightIcon size={30} /> {trail}
    </div>
  );
}
