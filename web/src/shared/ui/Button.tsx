import type { ComponentPropsWithRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '@/shared/lib/cx';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  /** Nút vuông chỉ chứa icon — bắt buộc truyền aria-label. */
  iconOnly?: boolean;
}

const buttonClass = ({ variant = 'secondary', size = 'md', iconOnly }: StyleProps, className?: string) =>
  cx(styles.button, styles[variant], styles[size], iconOnly && styles.iconOnly, className);

export function Button({ variant, size, iconOnly, className, type = 'button', ...rest }: StyleProps & ComponentPropsWithRef<'button'>) {
  return <button type={type} className={buttonClass({ variant, size, iconOnly }, className)} {...rest} />;
}

/** Liên kết điều hướng mang giao diện nút (tránh lồng <button> trong <a>). */
export function LinkButton({ variant, size, iconOnly, className, ...rest }: StyleProps & LinkProps) {
  return <Link className={buttonClass({ variant, size, iconOnly }, className)} {...rest} />;
}
