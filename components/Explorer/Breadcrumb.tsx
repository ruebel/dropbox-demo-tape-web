import styles from "./explorer.module.css";

type BreadcrumbProps = {
  name: string;
  onClick: (path: string) => void;
  path: string;
};

export function Breadcrumb({ name, onClick, path }: BreadcrumbProps) {
  return (
    <button className={styles.breadcrumb} onClick={() => onClick(path)}>
      {name}
    </button>
  );
}
