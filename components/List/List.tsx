import styles from "./list.module.css";

type ListProps<T> = {
  emptyMessage?: React.ReactNode | string;
  isLoading?: boolean;
  itemRenderer: (item: T, index: number) => React.ReactNode;
  items: T[];
  gap?: number;
  getKey?: (item: T, index: number) => string | number;
};

function getKeyDefault<T>(_item: T, index: number) {
  return index;
}

export function List<T>({
  emptyMessage,
  isLoading,
  itemRenderer,
  items,
  gap,
  getKey = getKeyDefault,
}: ListProps<T>) {
  if (isLoading) return null;

  if (items.length === 0) {
    if (emptyMessage) {
      return <div className={styles.emptyMesasge}>{emptyMessage}</div>;
    }

    return null;
  }

  return (
    <ul className={styles.list} style={{ gap }}>
      {items.map((item, index) => (
        <li key={getKey(item, index)}>{itemRenderer(item, index)}</li>
      ))}
    </ul>
  );
}
