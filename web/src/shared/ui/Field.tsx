import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import styles from './Field.module.css';

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  /** Chữ hiển thị góc phải nhãn, VD bộ đếm "12/30". */
  aside?: ReactNode;
  /** Chiếm 2 cột trong FormGrid. */
  wide?: boolean;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, required, error, hint, aside, wide, className, children }: FieldShellProps) {
  return (
    <div className={cx(styles.field, wide && styles.wide, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
        {aside && <span className={styles.aside}>{aside}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} className={styles.error} role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}

type SharedProps = Omit<FieldShellProps, 'id' | 'children'>;

export interface TextFieldProps extends SharedProps, Omit<ComponentPropsWithRef<'input'>, 'className'> {
  /** Đơn vị hiển thị trong ô, VD "kg". */
  suffix?: string;
}

export function TextField({ label, required, error, hint, aside, wide, className, suffix, id, ...input }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} error={error} hint={hint} aside={aside} wide={wide} className={className}>
      <div className={styles.controlWrap}>
        <input
          id={fieldId}
          className={cx(styles.control, error && styles.invalid, suffix && styles.withSuffix)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          aria-required={required || undefined}
          {...input}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends SharedProps, Omit<ComponentPropsWithRef<'select'>, 'className'> {
  options: ReadonlyArray<SelectOption | string>;
  placeholder?: string;
}

export function SelectField({ label, required, error, hint, aside, wide, className, options, placeholder, id, ...select }: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} error={error} hint={hint} aside={aside} wide={wide} className={className}>
      <select
        id={fieldId}
        className={cx(styles.control, styles.select, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        aria-required={required || undefined}
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(o => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </FieldShell>
  );
}

export interface TextAreaFieldProps extends SharedProps, Omit<ComponentPropsWithRef<'textarea'>, 'className'> {}

export function TextAreaField({ label, required, error, hint, aside, wide, className, id, rows = 3, ...textarea }: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} error={error} hint={hint} aside={aside} wide={wide} className={className}>
      <textarea
        id={fieldId}
        rows={rows}
        className={cx(styles.control, styles.textarea, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        aria-required={required || undefined}
        {...textarea}
      />
    </FieldShell>
  );
}

/** Lưới 2 cột cho các trường trong một khối form; tự về 1 cột trên màn hẹp. */
export function FormGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return <div className={cx(styles.grid, styles[`cols${columns}`])}>{children}</div>;
}
