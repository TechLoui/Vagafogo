import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

type Props = {
  title: string;
  description?: string;
  icon: IconType;
  actions?: ReactNode;
};

export default function AdminSectionHeading({ title, description, icon: Icon, actions }: Props) {
  return (
    <header className="admin-section-heading">
      <div className="admin-section-heading__identity">
        <span className="admin-section-heading__icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="admin-section-heading__actions">{actions}</div>}
    </header>
  );
}
