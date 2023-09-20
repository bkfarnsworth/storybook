import React, { useEffect, useLayoutEffect, useState } from 'react';
import { styled } from '@storybook/theming';
import type { API_Layout, API_ViewMode } from '@storybook/types';
import { useDragging } from './useDragging';
import { useMediaQuery } from '../hooks/useMedia';
import { MobileNavigation } from '../mobile-navigation/MobileNavigation';
import { BREAKPOINT_MIN_600 } from '../../constants';

interface InternalLayoutState {
  isDragging: boolean;
}

interface ManagerLayoutState
  extends Pick<API_Layout, 'navSize' | 'bottomPanelHeight' | 'rightPanelWidth' | 'panelPosition'> {
  viewMode: API_ViewMode;
}

export type LayoutState = InternalLayoutState & ManagerLayoutState;

interface Props {
  managerLayoutState: ManagerLayoutState;
  setManagerLayoutState: (state: Partial<Omit<ManagerLayoutState, 'viewMode'>>) => void;
  slotMain?: React.ReactNode;
  slotSidebar?: React.ReactNode;
  slotPanel?: React.ReactNode;
  slotPages?: React.ReactNode;
}
const MINIMUM_CONTENT_WIDTH_PX = 100;

const layoutStateIsEqual = (state: ManagerLayoutState, other: ManagerLayoutState) =>
  state.navSize === other.navSize &&
  state.bottomPanelHeight === other.bottomPanelHeight &&
  state.rightPanelWidth === other.rightPanelWidth &&
  state.panelPosition === other.panelPosition;

/**
 * Manages the internal state of panels while dragging, and syncs it with the
 * layout state in the global manager store when the user is done dragging.
 * Also syncs the layout state from the global manager store to the internal state
 * here when necessary
 */
const useLayoutSyncingState = (
  managerLayoutState: Props['managerLayoutState'],
  setManagerLayoutState: Props['setManagerLayoutState']
) => {
  // ref to keep track of previous managerLayoutState, to check if the props change
  const prevManagerLayoutStateRef = React.useRef<ManagerLayoutState>(managerLayoutState);

  const [internalDraggingSizeState, setInternalDraggingSizeState] = useState<LayoutState>({
    ...managerLayoutState,
    isDragging: false,
  });

  /**
   * Sync FROM managerLayoutState to internalDraggingState if user is not dragging
   */
  useEffect(() => {
    if (
      internalDraggingSizeState.isDragging || // don't interrupt user's drag
      layoutStateIsEqual(managerLayoutState, prevManagerLayoutStateRef.current) // don't set any state if managerLayoutState hasn't changed
    ) {
      return;
    }
    prevManagerLayoutStateRef.current = managerLayoutState;
    setInternalDraggingSizeState((state) => ({ ...state, ...managerLayoutState }));
  }, [internalDraggingSizeState.isDragging, managerLayoutState, setInternalDraggingSizeState]);

  /**
   * Sync size changes TO managerLayoutState when drag is done
   */
  useLayoutEffect(() => {
    if (
      internalDraggingSizeState.isDragging || // wait with syncing managerLayoutState until user is done dragging
      layoutStateIsEqual(prevManagerLayoutStateRef.current, internalDraggingSizeState) // don't sync managerLayoutState if it doesn't differ from internalDraggingSizeState
    ) {
      return;
    }
    const nextState = {
      navSize: internalDraggingSizeState.navSize,
      bottomPanelHeight: internalDraggingSizeState.bottomPanelHeight,
      rightPanelWidth: internalDraggingSizeState.rightPanelWidth,
    };
    prevManagerLayoutStateRef.current = {
      ...prevManagerLayoutStateRef.current,
      ...nextState,
    };
    setManagerLayoutState(nextState);
  }, [internalDraggingSizeState, setManagerLayoutState]);

  const isPagesShown =
    managerLayoutState.viewMode !== 'story' && managerLayoutState.viewMode !== 'docs';
  const isPanelShown = managerLayoutState.viewMode === 'story';

  const { panelResizerRef, sidebarResizerRef } = useDragging(
    setInternalDraggingSizeState,
    isPanelShown
  );
  const { navSize, rightPanelWidth, bottomPanelHeight } = internalDraggingSizeState.isDragging
    ? internalDraggingSizeState
    : managerLayoutState;

  return {
    navSize,
    rightPanelWidth,
    bottomPanelHeight,
    panelPosition: managerLayoutState.panelPosition,
    panelResizerRef,
    sidebarResizerRef,
    showPages: isPagesShown,
    showPanel: isPanelShown,
    isDragging: internalDraggingSizeState.isDragging,
  };
};

export const Layout = ({ managerLayoutState, setManagerLayoutState, ...slots }: Props) => {
  const isDesktop = useMediaQuery(BREAKPOINT_MIN_600);
  const isMobile = !isDesktop;

  const {
    navSize,
    rightPanelWidth,
    bottomPanelHeight,
    panelPosition,
    panelResizerRef,
    sidebarResizerRef,
    showPages,
    showPanel,
    isDragging,
  } = useLayoutSyncingState(managerLayoutState, setManagerLayoutState);

  return (
    <LayoutContainer
      navSize={navSize}
      rightPanelWidth={rightPanelWidth}
      bottomPanelHeight={bottomPanelHeight}
      panelPosition={managerLayoutState.panelPosition}
      isDragging={isDragging}
      viewMode={managerLayoutState.viewMode}
    >
      {showPages && <PagesContainer>{slots.slotPages}</PagesContainer>}
      <ContentContainer>{slots.slotMain}</ContentContainer>
      {isDesktop && (
        <>
          <SidebarContainer>
            <Drag ref={sidebarResizerRef} />
            {slots.slotSidebar}
          </SidebarContainer>
          {showPanel && (
            <PanelContainer position={panelPosition}>
              <Drag
                orientation={panelPosition === 'bottom' ? 'horizontal' : 'vertical'}
                position={panelPosition === 'bottom' ? 'left' : 'right'}
                ref={panelResizerRef}
              />
              {slots.slotPanel}
            </PanelContainer>
          )}
        </>
      )}
      {isMobile && <MobileNavigation />}
    </LayoutContainer>
  );
};

const LayoutContainer = styled.div<LayoutState>(
  ({ navSize, rightPanelWidth, bottomPanelHeight, viewMode, panelPosition }) => {
    return {
      width: '100%',
      height: '100svh', // We are using svh to use the minimum space on mobile
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',

      [`@media ${BREAKPOINT_MIN_600}`]: {
        display: 'grid',
        gap: 0,
        gridTemplateColumns: `minmax(0, ${navSize}px) minmax(${MINIMUM_CONTENT_WIDTH_PX}px, 1fr) minmax(0, ${rightPanelWidth}px)`,
        gridTemplateRows: `1fr minmax(0, ${bottomPanelHeight}px)`,
        gridTemplateAreas: (() => {
          if (viewMode === 'docs') {
            // remove panel in docs viewMode
            return `"sidebar content content"
                  "sidebar content content"`;
          }
          if (panelPosition === 'right') {
            return `"sidebar content panel"
                  "sidebar content panel"`;
          }
          return `"sidebar content content"
                "sidebar panel   panel"`;
        })(),
      },
    };
  }
);

const SidebarContainer = styled.div(({ theme }) => ({
  backgroundColor: theme.background.app,
  gridArea: 'sidebar',
  position: 'relative',
  borderRight: `1px solid ${theme.color.border}`,
}));

const ContentContainer = styled.div(({ theme }) => ({
  flex: 1,
  position: 'relative',
  backgroundColor: theme.background.content,
  display: 'grid', // This is needed to make the content container fill the available space

  [`@media ${BREAKPOINT_MIN_600}`]: {
    flex: 'auto',
    gridArea: 'content',
  },
}));

const PagesContainer = styled.div(({ theme }) => ({
  gridRowStart: 'sidebar-start',
  gridRowEnd: '-1',
  gridColumnStart: 'sidebar-end',
  gridColumnEnd: '-1',
  backgroundColor: theme.background.content,
  zIndex: 1,
}));

const PanelContainer = styled.div<{ position: LayoutState['panelPosition'] }>(
  ({ theme, position }) => ({
    gridArea: 'panel',
    position: 'relative',
    backgroundColor: theme.background.content,
    borderTop: position === 'bottom' ? `1px solid ${theme.color.border}` : null,
    borderLeft: position === 'right' ? `1px solid ${theme.color.border}` : null,
  })
);

const Drag = styled.div<{ orientation?: 'horizontal' | 'vertical'; position?: 'left' | 'right' }>(
  ({ theme }) => ({
    position: 'absolute',
    opacity: 0,
    transition: 'opacity 0.2s ease-in-out',
    zIndex: 100,

    '&:after': {
      content: '""',
      display: 'block',
      backgroundColor: theme.color.secondary,
    },

    '&:hover': {
      opacity: 1,
    },
  }),
  ({ orientation = 'vertical', position = 'left' }) => {
    if (orientation === 'vertical')
      return {
        width: '20px',
        height: '100%',
        top: 0,
        right: position === 'left' ? '-10px' : null,
        left: position === 'right' ? '-10px' : null,

        '&:after': {
          width: 1,
          height: '100%',
          marginLeft: 10,
        },

        '&:hover': {
          cursor: 'col-resize',
        },
      };
    return {
      width: '100%',
      height: '20px',
      top: '-10px',
      left: 0,

      '&:after': {
        width: '100%',
        height: 1,
        marginTop: 9,
      },

      '&:hover': {
        cursor: 'row-resize',
      },
    };
  }
);