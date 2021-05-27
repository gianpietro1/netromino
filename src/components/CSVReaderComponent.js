import React from "react";
import { Label, Button } from "semantic-ui-react";
import { CSVReader } from "react-papaparse";

const buttonRef = React.createRef();

const CSVReaderComponent = ({ uploadFile }) => {
  const handleOpenDialog = e => {
    // Note that the ref is set async, so it might be null at some point
    if (buttonRef.current) {
      buttonRef.current.open(e);
    }
  };

  const handleOnFileLoad = data => {
    uploadFile(data);
  };

  const handleOnError = (err, file, inputElem, reason) => {
    console.log(err);
  };

  const handleOnRemoveFile = data => {
    console.log("---------------------------");
    console.log(data);
    console.log("---------------------------");
  };

  const handleRemoveFile = e => {
    // Note that the ref is set async, so it might be null at some point
    if (buttonRef.current) {
      buttonRef.current.removeFile(e);
    }
  };

  return (
    <>
      <CSVReader
        ref={buttonRef}
        onFileLoad={handleOnFileLoad}
        onError={handleOnError}
        noClick
        noDrag
        config={{ header: true }}
        style={{}}
        onRemoveFile={handleOnRemoveFile}
      >
        {({ file }) => (
          <aside>
            <Button primary onClick={handleOpenDialog}>
              Upload VNFs CSV
            </Button>
            {file && (
              <Label size={"large"} style={{ margin: "0 1rem" }}>
                File: {file.name}
              </Label>
            )}
            {/* {file && (
              <Button negative onClick={handleRemoveFile}>
                Remover
              </Button>
            )} */}
            <a
              target="_blank"
              rel="noreferrer"
              href={
                "https://drive.google.com/file/d/1xEq3V8PZqp-kjNg2IOVgggsN7bk1v_gF/view?usp=sharing"
              }
            >
              CSV File example
            </a>
          </aside>
        )}
      </CSVReader>
    </>
  );
};

export default CSVReaderComponent;
