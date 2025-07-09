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

- [x] 1.0 Implement Preset Scenario System
  - [x] 1.1 Create preset scenario data structures with realistic bias patterns
  - [x] 1.2 Add preset scenario buttons with color-coded risk indicators
  - [x] 1.3 Implement scenario loading functionality to populate form fields
  - [x] 1.4 Add visual feedback for scenario selection and loading

- [x] 2.0 Build Export Functionality
  - [x] 2.1 Create JSON export data structure with metadata
  - [x] 2.2 Implement file download functionality with proper naming
  - [x] 2.3 Add export button that appears only after analysis completion
  - [x] 2.4 Handle export errors gracefully with user feedback

- [x] 3.0 Develop Counterfactual Analysis Display
  - [x] 3.1 Create counterfactual scenario data generation logic
  - [x] 3.2 Design and implement counterfactual analysis UI component
  - [x] 3.3 Add likelihood indicators with color-coded confidence levels
  - [x] 3.4 Integrate counterfactual display into results section

- [x] 4.0 Create Historical Comparison System
  - [x] 4.1 Implement simulated historical data generation
  - [x] 4.2 Build comparison metrics calculation (vs average, trends)
  - [x] 4.3 Design historical comparison UI with visual indicators
  - [x] 4.4 Add trend direction analysis and display

- [x] 5.0 Testing and Quality Assurance
  - [x] 5.1 Write unit tests for all new utility functions
  - [x] 5.2 Create end-to-end tests for complete demo workflow
  - [x] 5.3 Test export functionality across different browsers
  - [x] 5.4 Verify accessibility compliance for new interactive elements
  - [x] 5.5 Performance testing for enhanced demo features

- [ ] 6.0 **TO BE ANNOUNCED**