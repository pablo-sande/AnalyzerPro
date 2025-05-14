import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}
declare const Button: React.FC<ButtonProps>;

interface CardProps {
    children: React.ReactNode;
    className?: string;
}
declare const Card: React.FC<CardProps>;

interface TableProps {
    headers: string[];
    rows: (string | number | React.ReactNode)[][];
    className?: string;
}
declare const Table: React.FC<TableProps>;

export { Button, type ButtonProps, Card, type CardProps, Table, type TableProps };
