import { Box, Button, ButtonGroup, TableCaption, Title } from '@adminjs/design-system';
import {
  ActionJSON,
  buildActionClickHandler,
  RecordJSON,
  ResourceJSON,
  useActionResponseHandler,
  useModal,
  useTranslation,
} from 'adminjs';
import React from 'react';
import { useLocation, useNavigate } from 'react-router';

type SelectedRecordsProps = {
  resource: ResourceJSON;
  selectedRecords?: Array<RecordJSON>;
};

const getBulkActions = (records: Array<RecordJSON>): Array<ActionJSON> => (
  Object.values(records.reduce((actions, record) => ({
    ...actions,
    ...record.bulkActions.reduce((recordActions, action) => ({
      ...recordActions,
      [action.name]: action,
    }), {} as Record<string, ActionJSON>),
  }), {} as Record<string, ActionJSON>))
);

const SelectedRecords = ({ resource, selectedRecords }: SelectedRecordsProps) => {
  const translateFunctions = useTranslation();
  const { translateLabel } = translateFunctions;
  const navigate = useNavigate();
  const location = useLocation();
  const modalFunctions = useModal();

  // The normal AdminJS action response handler shows notices. Its callback then
  // refreshes the current list URL, rather than opening a bulk-action page.
  const actionResponseHandler = useActionResponseHandler(() => {
    const query = new URLSearchParams(location.search);
    query.set('refresh', 'true');
    navigate({ pathname: location.pathname, search: query.toString() }, { replace: true });
  });

  if (!selectedRecords?.length) return null;

  const params = {
    resourceId: resource.id,
    recordIds: selectedRecords.map((record) => record.id),
  };
  const actions = getBulkActions(selectedRecords);

  return (
    <TableCaption>
      <Box flex py="sm" alignItems="center">
        <Title mr="lg">
          {translateLabel('selectedRecords', resource.id, { selected: selectedRecords.length })}
        </Title>
        <ButtonGroup size="sm" rounded>
          {actions.map((action) => {
            const onClick = buildActionClickHandler({
              action,
              params,
              actionResponseHandler,
              navigate,
              location,
              translateFunctions,
              modalFunctions,
            });

            return (
              <Button key={action.name} variant={action.variant} onClick={onClick}>
                {action.label}
              </Button>
            );
          })}
        </ButtonGroup>
      </Box>
    </TableCaption>
  );
};

export default SelectedRecords;
