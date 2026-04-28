import type { FC } from 'react';

interface CellProps {
  value: number;
  active?: boolean;
}

export const Cell: FC<CellProps> = ({ value, active }) => {
  const cls =
    `cell` +
    (value ? ` c${value}` : '') +
    (active ? ' active' : '');
  return <div className={cls} />;
};
