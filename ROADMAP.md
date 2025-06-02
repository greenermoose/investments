# Portfolio Snapshots & Comparison Roadmap

This roadmap outlines the steps to implement the ability to upload, select, and compare multiple portfolio snapshots, as well as view historical changes in portfolio value and holdings.

## Phase 1: Snapshot Selection
- [x] Create a `SnapshotSelector` component for choosing among available snapshots for the current account.
- [x] Integrate `SnapshotSelector` into the `PortfolioHeader` so users can select which snapshot to view.
- [x] Ensure the app state and display update when a new snapshot is selected.

## Phase 2: Snapshot Comparison
- [x] Add a "Compare Snapshots" button to the header or history tab.
- [x] Create a `SnapshotComparison` view/component to allow users to select two snapshots and see:
    - Added/removed securities
    - Changes in quantities and market values
    - Summary of total value and gain/loss differences
- [x] Implement backend logic to compare two snapshots and return the differences.

## Phase 3: Historical Analysis
- [x] Create basic performance charts showing portfolio value over time.
- [ ] Create an interactive `SnapshotTimeline` component to visualize all snapshots for an account over time.
- [ ] Allow users to click on points in the timeline to view or compare snapshots.
- [ ] Show historical trends in total value, gain/loss, and asset allocation.

## Phase 4: UI/UX Enhancements
- [x] Polish the snapshot selector dropdown (sorting, formatting, accessibility).
- [x] Add loading and error states for snapshot fetching and comparison.
- [ ] Add tooltips, help, and documentation for new features.

## Phase 5: Testing & Validation
- [ ] Unit tests for snapshot selection and comparison logic.
- [ ] Integration tests for UI flows (selecting, comparing, viewing history).
- [ ] User testing and feedback collection.

---

**Current Status:**
- Basic snapshot selection and comparison features are implemented.
- Initial performance charts are in place but need enhancement.
- Next: Implement interactive timeline visualization and improve historical analysis features. 