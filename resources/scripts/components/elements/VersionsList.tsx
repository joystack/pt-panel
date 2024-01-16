import React from 'react';
import { VersionsResult } from '@/api/http';
interface RenderFuncProps<T> {
    items: T[];
}

interface Props<T> {
    data: VersionsResult<T>;
    children: (props: RenderFuncProps<T>) => React.ReactNode;
}

function VersionsList<T>({ data: { items }, children }: Props<T>) {
    return <>{children({ items })}</>;
}

export default VersionsList;
