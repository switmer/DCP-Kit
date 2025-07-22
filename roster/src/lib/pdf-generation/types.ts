export type TemplateParams = {
  sheetData: any;
  //-- classic | advanced | modern | biscuit.
  options: {
    template: 'clsc' | 'advd' | 'mdrn' | 'bsct';
    style?: any;
    SECTION_HEADER_FILL?: string;
    WATERMARKED?: boolean;
    USE_TWO_COLUMNS?: boolean;
  };
};
