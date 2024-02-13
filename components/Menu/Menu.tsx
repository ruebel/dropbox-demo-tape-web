import styles from "./menu.module.css";

type MenuItem = {
  label: string;
  onClick: () => void;
};

type MenuProps = {
  items: MenuItem[];
  targetRef: React.RefObject<HTMLDivElement>;
};

export function Menu({ items, targetRef }: MenuProps) {
  const target = targetRef.current;

  if (!target) return null;

  const position = target.getBoundingClientRect();

  return (
    <div
      className={styles.menuWrapper}
      style={{
        top: position.bottom,
        left: position.x + position.width,
      }}
    >
      <ul className={styles.menu} role="menu">
        {items.map((item, index) => (
          <li
            className={styles.menuItem}
            key={index}
            role="menuitem"
            onClick={item.onClick}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
