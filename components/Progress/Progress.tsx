import styles from "./progress.module.css";

export function Progress() {
  return (
    <div className={styles.progress}>
      <span className={styles.bar1} />
      <span className={styles.bar2} />
    </div>
  );
}
