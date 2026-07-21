import React from 'react';
import styles from '../pre-auth-form.scss';

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span>
    {children}
    <span className={styles.required} aria-hidden="true">
      *
    </span>
  </span>
);

export default RequiredLabel;
