import { Box, Button, Drawer, DrawerContent, DrawerFooter, H3, Icon } from '@adminjs/design-system';
import isNil from 'lodash/isNil.js';
import pickBy from 'lodash/pickBy.js';
import React, { FormEventHandler, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  BasePropertyComponent,
  RecordJSON,
  ResourceJSON,
  useFilterDrawer,
  useQueryParams,
  useTranslation,
} from 'adminjs';

type FilterProps = { resource: ResourceJSON };
type MatchProps = { resourceId: string };

const FilterDrawer = ({ resource }: FilterProps) => {
  const [filter, setFilter] = useState<Record<string, unknown>>({});
  const params = useParams<MatchProps>();
  const location = useLocation();
  const initialLoad = useRef(true);
  const previousPathname = useRef(location.pathname);
  const { translateButton, translateLabel } = useTranslation();
  const { isVisible, toggleFilter, close } = useFilterDrawer();
  const { storeParams, clearParams, filters } = useQueryParams();

  useEffect(() => {
    if (previousPathname.current !== location.pathname) {
      close();
      previousPathname.current = location.pathname;
    }
  }, [close, location.pathname]);

  useEffect(() => {
    if (initialLoad.current) initialLoad.current = false;
    else setFilter({});
  }, [params.resourceId]);

  useEffect(() => {
    if (filters) setFilter(filters);
  }, [filters]);

  const handleSubmit: FormEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
    storeParams({ filters: pickBy(filter, (value) => !isNil(value)), page: '1' });
  };

  const handleReset: FormEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
    clearParams('filters');
    setFilter({});
  };

  const handleChange = (propertyName: string | RecordJSON, value: unknown): void => {
    if ((propertyName as RecordJSON).params) throw new Error('You cannot pass RecordJSON to filters.');
    setFilter({
      ...filter,
      [propertyName as string]: typeof value === 'string' && !value.length ? undefined : value,
    });
  };

  return (
    <Drawer variant="filter" isHidden={!isVisible} as="form" onSubmit={handleSubmit} onReset={handleReset}>
      <DrawerContent>
        <Box flex justifyContent="space-between">
          <H3>{translateLabel('filters', resource.id)}</H3>
          <Button type="button" variant="light" size="icon" rounded color="text" onClick={toggleFilter}>
            <Icon icon="X" />
          </Button>
        </Box>
        <Box my="x3">
          {resource.filterProperties.map((property) => (
            <BasePropertyComponent
              key={property.propertyPath}
              where="filter"
              onChange={handleChange}
              property={property}
              filter={filter}
              resource={resource}
            />
          ))}
        </Box>
      </DrawerContent>
      <DrawerFooter>
        <Button type="button" variant="light" onClick={handleReset}>
          {translateButton('resetFilter', resource.id)}
        </Button>
        <Button type="submit" variant="contained">
          {translateButton('applyChanges', resource.id)}
        </Button>
      </DrawerFooter>
    </Drawer>
  );
};

export default FilterDrawer;
