## Relevant Files

- `src/pages/demo/bias-detection.astro` - Main bias detection demo page with enhanced features
- `src/components/ui/button.tsx` - Button component used for preset scenarios and export functionality
- `src/components/ui/card.tsx` - Card components for organizing demo sections
- `src/lib/types/bias-detection.ts` - TypeScript types for bias detection demo data structures
- `src/lib/utils/demo-helpers.ts` - Utility functions for demo data generation and export
- `src/lib/utils/demo-helpers.test.ts` - Unit tests for demo helper functions
- `tests/e2e/bias-detection-demo.spec.ts` - End-to-end tests for enhanced demo functionality
- `src/styles/demo-animations.css` - Custom animations and transitions for demo enhancements

### Notes

- The main demo file has been enhanced with preset scenarios, export functionality, counterfactual analysis, and historical comparison features
- Unit tests should cover the new utility functions for data generation and export
- End-to-end tests should verify the complete user flow including preset loading and export functionality
- Use `npx jest [optional/path/to/test/file]` to run tests

## Tasks

- [ ] 1.0 Implement Preset Scenario System
  - [ ] 1.1 Create preset scenario data structures with realistic bias patterns
  - [ ] 1.2 Add preset scenario buttons with color-coded risk indicators
  - [ ] 1.3 Implement scenario loading functionality to populate form fields
  - [ ] 1.4 Add visual feedback for scenario selection and loading

- [ ] 2.0 Build Export Functionality
  - [ ] 2.1 Create JSON export data structure with metadata
  - [ ] 2.2 Implement file download functionality with proper naming
  - [ ] 2.3 Add export button that appears only after analysis completion
  - [ ] 2.4 Handle export errors gracefully with user feedback

- [ ] 3.0 Develop Counterfactual Analysis Display
  - [ ] 3.1 Create counterfactual scenario data generation logic
  - [ ] 3.2 Design and implement counterfactual analysis UI component
  - [ ] 3.3 Add likelihood indicators with color-coded confidence levels
  - [ ] 3.4 Integrate counterfactual display into results section

- [ ] 4.0 Create Historical Comparison System
  - [ ] 4.1 Implement simulated historical data generation
  - [ ] 4.2 Build comparison metrics calculation (vs average, trends)
  - [ ] 4.3 Design historical comparison UI with visual indicators
  - [ ] 4.4 Add trend direction analysis and display

- [ ] 5.0 Testing and Quality Assurance
  - [ ] 5.1 Write unit tests for all new utility functions
  - [ ] 5.2 Create end-to-end tests for complete demo workflow
  - [ ] 5.3 Test export functionality across different browsers
  - [ ] 5.4 Verify accessibility compliance for new interactive elements
  - [ ] 5.5 Performance testing for enhanced demo features