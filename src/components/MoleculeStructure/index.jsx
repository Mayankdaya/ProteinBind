"use client";
import React, { Component } from "react";
import _ from "lodash";
import PropTypes from "prop-types";
import initRDKitModule from "@rdkit/rdkit";

const initRDKit = (() => {
  let rdkitLoadingPromise;
  return () => {
    if (!rdkitLoadingPromise) {
      rdkitLoadingPromise = new Promise((resolve, reject) => {
        initRDKitModule()
          .then((RDKit) => {
            resolve(RDKit);
          })
          .catch((e) => {
            reject(e);
          });
      });
    }
    return rdkitLoadingPromise;
  };
})();

class MoleculeStructure extends Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    className: PropTypes.string,
    svgMode: PropTypes.bool,
    width: PropTypes.number,
    height: PropTypes.number,
    structure: PropTypes.string.isRequired,
    subStructure: PropTypes.string,
    extraDetails: PropTypes.object,
    drawingDelay: PropTypes.number,
    scores: PropTypes.number,
  };

  static defaultProps = {
    subStructure: "",
    className: "",
    width: 300,
    height: 250,
    svgMode: true,
    extraDetails: {},
    drawingDelay: undefined,
    scores: 0,
  };

  constructor(props) {
    super(props);

    this.MOL_DETAILS = {
      width: this.props.width,
      height: this.props.height,
      bondLineWidth: 1,
      addStereoAnnotation: true,
      ...this.props.extraDetails,
    };

    this.state = {
      svg: undefined,
      rdKitLoaded: false,
      rdKitError: false,
    };
  }

  drawOnce = (() => {
    let wasCalled = false;

    return () => {
      if (!wasCalled) {
        wasCalled = true;
        this.draw();
      }
    };
  })();

  draw() {
    if (this.props.drawingDelay) {
      setTimeout(() => {
        this.drawSVGorCanvas();
      }, this.props.drawingDelay);
    } else {
      this.drawSVGorCanvas();
    }
  }

  drawSVGorCanvas() {
    try {
      const mol = this.RDKit.get_mol(this.props.structure || "invalid");
      const qmol = this.RDKit.get_qmol(this.props.subStructure || "invalid");
      const isValidMol = this.isValidMol(mol);

      if (this.props.svgMode && isValidMol) {
        const svg = mol.get_svg_with_highlights(this.getMolDetails(mol, qmol));
        this.setState({ svg });
      } else if (isValidMol) {
        const canvas = document.getElementById(this.props.id);
        if (!canvas) {
          console.error(`Canvas element with id ${this.props.id} not found`);
          return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
          console.error('Failed to get canvas context');
          return;
        }
        // Clear the canvas before drawing
        context.clearRect(0, 0, canvas.width, canvas.height);
        mol.draw_to_canvas_with_highlights(canvas, this.getMolDetails(mol, qmol));
      }

      mol?.delete();
      qmol?.delete();
    } catch (error) {
      console.error('Error in drawSVGorCanvas:', error);
      this.setState({ rdKitError: true });
    }
  }

  isValidMol(mol) {
    return !!mol;
  }

  getMolDetails(mol, qmol) {
    if (this.isValidMol(mol) && this.isValidMol(qmol)) {
      const subStructHighlightDetails = JSON.parse(
        mol.get_substruct_matches(qmol),
      );
      const subStructHighlightDetailsMerged = !_.isEmpty(
        subStructHighlightDetails,
      )
        ? subStructHighlightDetails.reduce(
            (acc, { atoms, bonds }) => ({
              atoms: [...acc.atoms, ...atoms],
              bonds: [...acc.bonds, ...bonds],
            }),
            { bonds: [], atoms: [] },
          )
        : subStructHighlightDetails;
      return JSON.stringify({
        ...this.MOL_DETAILS,
        ...(this.props.extraDetails || {}),
        ...subStructHighlightDetailsMerged,
      });
    } else {
      return JSON.stringify({
        ...this.MOL_DETAILS,
        ...(this.props.extraDetails || {}),
      });
    }
  }

  componentDidMount() {
    if (!this.state.rdKitLoaded && !this.state.rdKitError) {
      this.initializeRDKit();
    }
  }
  componentDidUpdate(prevProps) {
    if (
      !this.state.rdKitError &&
      this.state.rdKitLoaded &&
      !this.props.svgMode
    ) {
      this.drawOnce();
    }

    if (this.state.rdKitLoaded) {
      const shouldUpdateDrawing =
        prevProps.structure !== this.props.structure ||
        prevProps.svgMode !== this.props.svgMode ||
        prevProps.subStructure !== this.props.subStructure ||
        prevProps.width !== this.props.width ||
        prevProps.height !== this.props.height ||
        !_.isEqual(prevProps.extraDetails, this.props.extraDetails);

      if (shouldUpdateDrawing) {
        this.draw();
      }
    }
  }

  render() {
    if (this.state.rdKitError) {
      return (
        <div className="p-4 text-red-500 bg-red-100 rounded-lg">
          <p className="font-medium">Failed to initialize molecule renderer</p>
          <p className="text-sm mt-1">Reason: RDKit WASM module failed to load. Check if RDKit files are present in the public directory.</p>
        </div>
      );
    }
    if (!this.state.rdKitLoaded) {
      return (
        <div className="p-4 text-blue-500 bg-blue-100 rounded-lg">
          <div className="flex items-center justify-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">Loading molecule renderer...</span>
          </div>
          <p className="text-sm mt-2 text-center">Please wait while RDKit initializes</p>
        </div>
      );
    }

    const mol = this.RDKit.get_mol(this.props.structure || "invalid");
    const isValidMol = this.isValidMol(mol);
    mol?.delete();

    if (!isValidMol) {
      return (
        <div className="p-4 text-red-500 bg-red-100 rounded-lg">
          <p className="font-medium">Invalid Molecule Structure</p>
          <p className="text-sm mt-1">The provided SMILES string could not be parsed: {this.props.structure}</p>
          <p className="text-xs mt-2">Please check if the molecular structure is correctly formatted.</p>
        </div>
      );
    } else if (this.props.svgMode) {
      return (
        <div
          title={this.props.structure}
          className={"molecule-structure-svg " + (this.props.className || "")}
          style={{ width: this.props.width, height: this.props.height }}
          dangerouslySetInnerHTML={{ __html: this.state.svg }}
        ></div>
      );
    } else {
      return (
        <div
          className={
            "molecule-canvas-container " + (this.props.className || "")
          }
        >
          <canvas
            title={this.props.structure}
            id={this.props.id}
            width={this.props.width}
            height={this.props.height}
          ></canvas>
          {this.props.scores ? (
            <p className="text-red-600 z-50 p-10">
              Score: {this.props.scores.toFixed(2)}
            </p>
          ) : (
            ""
          )}
        </div>
      );
    }
  }
  initializeRDKit(retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
  
    initRDKit()
      .then((RDKit) => {
        if (!RDKit) {
          throw new Error('Failed to initialize RDKit');
        }
        this.RDKit = RDKit;
        this.setState({ rdKitLoaded: true, rdKitError: false });
        try {
          this.draw();
        } catch (err) {
          console.error('Error drawing molecule:', err);
          this.setState({ 
            rdKitError: true,
            errorMessage: err.message || 'Error drawing molecule'
          });
        }
      })
      .catch((err) => {
        console.error('Error initializing RDKit:', err);
        if (retryCount < maxRetries) {
          console.log(`Retrying RDKit initialization (${retryCount + 1}/${maxRetries})...`);
          this.setState({
            loadingMessage: `Retrying initialization (${retryCount + 1}/${maxRetries})...`
          });
          setTimeout(() => {
            this.initializeRDKit(retryCount + 1);
          }, retryDelay * (retryCount + 1));
        } else {
          this.setState({ 
            rdKitError: true,
            errorMessage: err.message || 'Failed to initialize RDKit after multiple attempts'
          });
        }
      });
  }
}

export default MoleculeStructure;
