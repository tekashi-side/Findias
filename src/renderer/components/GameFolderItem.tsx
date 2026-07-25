import type { FC, ReactNode } from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';

type GameFolderItemProps = {
  title: string;
  path: string;
  icon: ReactNode;
  actions?: ReactNode;
};

/** Presentational row for a game folder path during setup. */
const GameFolderItem: FC<GameFolderItemProps> = ({ title, path, icon, actions }) => (
  <Item variant="outline">
    <ItemMedia variant="icon">{icon}</ItemMedia>
    <ItemContent>
      <ItemTitle>{title}</ItemTitle>
      <ItemDescription className="font-mono text-xs break-all">{path}</ItemDescription>
    </ItemContent>
    {actions ? <ItemActions>{actions}</ItemActions> : null}
  </Item>
);

export default GameFolderItem;
