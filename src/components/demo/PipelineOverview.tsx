import React, { useState, useEffect } from 'react';
import ProgressBar from '../ui/progress-bar';
import '../../styles/pipeline-demo.css';

const pipelineStages = [
  "Knowledge Parsing",
  "Scenario Generation",
  "Conversation Generation",
  "Clinical Validation",
  "Category Balancing",
  "Results Export",
  "Final Review"
];

const PipelineOverview = () => {
  const [selectedStage, setSelectedStage] = useState(null);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newProgress = {};
      pipelineStages.forEach(stage => {
        const currentProgress = progress[stage] || 0;
        if (currentProgress < 100) {
          newProgress[stage] = Math.min(currentProgress + Math.random() * 10, 100);
        } else {
          newProgress[stage] = 100;
        }
      });
      setProgress(newProgress);
    }, 2000);
    return () => clearInterval(interval);
  }, [progress]);

  const handleStageClick = (stage) => {
    setSelectedStage(stage);
    console.log(`Selected stage: ${stage}`);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>Pipeline Stages</h2>
      <div className="pipeline-container" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        {pipelineStages.map((stage, index) => (
          <React.Fragment key={stage}>
            <div 
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                cursor: 'pointer',
                backgroundColor: selectedStage === stage ? '#e0e0e0' : 'transparent',
                width: '120px'
              }}
              onClick={() => handleStageClick(stage)}
            >
              <div>{stage}</div>
              <ProgressBar progress={progress[stage] || 0} />
            </div>
            {index < pipelineStages.length - 1 && (
              <div className="pipeline-arrow" style={{ position: 'relative', width: '50px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '24px' }}>→</div>
                <div className="flow-animation"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {selectedStage && <p>Selected Stage: {selectedStage}</p>}
    </div>
  );
};

export default PipelineOverview;
