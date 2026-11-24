// @vitest-environment jsdom
import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {museumCatalog, museumRooms, museumTotal} from '../app/data/museumClassification';
import {historicalMotionCollections, historicalCollectionSummary, resolveHistoricalMotionCollections} from '../app/data/historicalMotionCollections';
import MuseumNavigation from '../app/components/MuseumNavigation';

afterEach(cleanup);
describe('historical cross-collections / Issue #90', () => {
  it('preserves 286 unique exhibits and 13 existing rooms', () => {
    expect(museumCatalog).toHaveLength(286);
    expect(museumTotal).toBe(286);
    expect(museumRooms).toHaveLength(13);
    expect(new Set(museumCatalog.map(e => e.key)).size).toBe(286);
  });
  it('links only to existing historical records and does not count appearances as objects', () => {
    const groups = resolveHistoricalMotionCollections();
    const summary = historicalCollectionSummary();
    expect(summary).toEqual({collections:3, placements:13, distinctWorks:11});
    expect(historicalMotionCollections).toHaveLength(3);
    const allKeys = groups.flatMap(g => g.exhibits.map(e => e.key));
    expect(allKeys.filter(k => k === 'ms-dos-pc-command-line:text-progress')).toHaveLength(2);
    for (const group of groups) {
      expect(new Set(group.exhibits.map(e => e.key)).size).toBe(group.exhibits.length);
      for (const placement of group.exhibits) {
        expect(placement.record.categories).toContain('historical');
        expect(placement.record.href.startsWith('#')).toBe(true);
        expect(placement.provenance).toBe('not-reviewed');
        expect(placement.sources).toEqual([]);
      }
    }
  });
  it('rejects missing, nonhistorical and repeated placements within one collection', () => {
    const cloned = museumCatalog.filter(e => e.key !== 'ms-dos-pc-command-line:text-progress');
    expect(() => resolveHistoricalMotionCollections(cloned)).toThrow('Unknown museum record');
    const modernized = museumCatalog.map(e => e.key === 'ms-dos-pc-command-line:text-progress' ? {...e, categories:['modern' as const]} : e);
    expect(() => resolveHistoricalMotionCollections(modernized)).toThrow('Non-historical reference');
  });
  it('renders cross-room links while leaving modern-only navigation free of historical shelves', () => {
    render(<MuseumNavigation />);
    const shelf = screen.getByRole('region', {name:'歴史の動き・横断コレクション'});
    expect(within(shelf).getAllByRole('link', {name:'文字プログレスバー'})).toHaveLength(2);
    expect(within(shelf).getByText('13掲載 / 11固有作品')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name:/Modern Motion/}));
    expect(screen.queryByRole('region', {name:'歴史の動き・横断コレクション'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:/Historical Motion/}));
    expect(screen.getByRole('region', {name:'歴史の動き・横断コレクション'})).toBeTruthy();
  });
});
