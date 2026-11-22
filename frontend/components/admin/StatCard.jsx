import styles from "./StatCard.module.css";

export default function StatCard({ label, value, icon, tone = "default", description }) {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon ? <span className={`${styles.icon} ${styles[tone] || ""}`}>{icon}</span> : null}
      </div>
      <p className={styles.value}>{value}</p>
      {description ? <p className={styles.desc}>{description}</p> : null}
    </div>
  );
}
