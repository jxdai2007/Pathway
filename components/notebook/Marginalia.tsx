import styles from './notebook.module.css';

type Props = {
  text: string;
  rot: number;
  top: number;
};

export function Marginalia({ text, rot, top }: Props) {
  return (
    <div
      className={styles.marginalia}
      style={{ transform: `rotate(${rot}deg)`, top: `${top}px` }}
    >
      {text}
    </div>
  );
}
