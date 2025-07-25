import { clsc } from '@/lib/pdf-generation/templates/clsc';
import { advd } from '@/lib/pdf-generation/templates/advd';
import { mdrn } from '@/lib/pdf-generation/templates/mdrn';
import { CompanyEntityType } from '@/types/type';

type Person = {
  name: string;
  email: string;
  phone: string;
  title: string;
  location: string;
  call_time: string;
  department: string;
};

type Options = {
  sheetData: any;
  //-- classic | advanced | biscuit.
  options: {
    template: 'clsc' | 'advd' | 'mdrn' | 'bsct';
    style?: any;
    SECTION_HEADER_FILL?: string;
    WATERMARKED?: boolean;
    USE_TWO_COLUMNS?: boolean;
  };
};

export const genDocByTemplate = (options: Options) => {
  //-- group people by department.
  const departmentGroups: Record<string, Person[]> = options.sheetData.people.reduce(
    (groups: Record<string, Person[]>, person: Person) => {
      const dept = person.department.toLowerCase() || 'Unassigned';

      if (!groups[dept]) {
        groups[dept] = [];
      }

      groups[dept].push(person);

      return groups;
    },
    {},
  );

  const priorityOrder = ['production', 'directing'];

  //-- sort departments based on priority order.
  const sortedDepartments = Object.entries(departmentGroups).sort(([a], [b]) => {
    const indexA = priorityOrder.indexOf(a);
    const indexB = priorityOrder.indexOf(b);

    if (indexA === -1 && indexB === -1) {
      return a.localeCompare(b);
    }

    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  const sortedDepartmentGroups = Object.fromEntries(sortedDepartments);

  //-- create tables for each department.
  const departmentTables = Object.entries(sortedDepartmentGroups).map(([dept, people]) => {
    return {
      table: {
        headerRows: 1,
        widths: ['18%', '18%', '15%', '25%', '12%', '12%'],
        body: [
          [
            {
              text: dept.toUpperCase(),
              //-- adjust font size depending on text length.
              ...(dept && dept.length > 10 ? { fontSize: 9 } : dept && dept.length > 14 ? { fontSize: 8 } : {}),
              style: 'tableHeader',
              alignment: 'left',
            },
            {
              text: 'NAME',
              style: 'tableHeader',
            },
            {
              text: 'PHONE',
              style: 'tableHeader',
            },
            {
              text: 'EMAIL',
              style: 'tableHeader',
            },
            {
              text: 'CALL',
              style: 'tableHeader',
            },
            {
              text: 'WRAP',
              style: 'tableHeader',
            },
          ],
          ...people.map((person: any) => [
            {
              text: person.title ?? '',
              //-- adjust font size depending on text length.
              ...(person.title && person.title.length > 18 ? { fontSize: 7 } : person.title && person.title.length > 22 ? { fontSize: 6 } : {}),
              style: 'tableCell',
            },
            {
              text: person.name ?? '',
              //-- adjust font size depending on text length.
              ...(person.name && person.name.length > 18 ? { fontSize: 7 } : person.name && person.name.length > 22 ? { fontSize: 6 } : {}),
              style: 'tableCell',
            },
            {
              text: person.phone ?? '',
              style: 'tableCell',
              // alignment: 'center',
            },
            {
              text: person.email ?? '',
              ...(person.email && person.email.length > 24 ? { fontSize: 7 } : person.email && person.email.length > 28 ? { fontSize: 6 } : {}),
              style: 'tableCell',
              // alignment: 'center',
            },
            {
              text: person.call_time ?? options.sheetData.general_crew_call ?? '',
              style: 'tableCell',
              // alignment: 'center',
            },
            {
              text: person.wrap_time ?? options.sheetData.general_crew_wrap ?? '',
              style: 'tableCell',
              // alignment: 'center',
            },
          ]),
        ],
      },
      layout: {
        hLineWidth: (i: number, node: any): number => {
          // return i === 0 || i === 1 || i === node.table.body?.length
          //   ? 1
          //   : 0.5;
          return 1;
        },
        vLineWidth: () => 0.5,
        hLineColor: (i: number) => (i === 1 ? '#000' : '#aaa'),
        vLineColor: () => '#aaa',
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
    };
  });

  //-- build a table for the agreement.
  const agreementTable = {
    stack: [
      {
        text: 'AGREEMENT',
        style: 'tableHeader',
        alignment: 'left',
        margin: [0, 0, 0, 10],
      },
      {
        text: options.sheetData?.agreement || '',
        style: 'bold',
        margin: [0, 0, 0, 10],
      },
    ],
  };

  //-- build a table for the notes.
  const notesTable = {
    table: {
      headerRows: 1,
      widths: ['*'],
      body: [
        [
          {
            text: 'NOTES',
            style: 'tableHeader',
            alignment: 'left',
          },
        ],
      ].concat(
        options.sheetData.notes_and_instructions?.map(
          (note: { title: string; body: string; isHighlighted: boolean }, i: number) => [
            {
              text: [
                // { text: `${i + 1}. `, style: 'noteBody' },
                {
                  text: note.title ? `${note.title}: ` : '',
                  style: 'noteTitle',
                },
                {
                  text: note.body ?? '',
                  style: 'noteBody',
                },
              ],
              ...(note.isHighlighted ? { fillColor: '#FFFF00' } : {}),
            },
          ],
        ),
      ),
    },
    layout: {
      hLineWidth: function (i: number, node: any): number {
        return i === 0 || i === 1 || i === node.table.body?.length ? 1 : 0.5;
      },
      vLineWidth: () => 0.5,
      hLineColor: (i: number): string => (i === 1 ? '#000' : '#aaa'),
      vLineColor: () => '#aaa',
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
  };

  //-- build a table for the production report.
  const productionReportTable = {
    table: {
      headerRows: 1,
      widths: ['30%', '70%'],
      body: [
        [
          {
            text: 'PRODUCTION REPORT',
            style: 'tableHeader',
            alignment: 'left',
            colSpan: 2,
          },
          {},
        ],
        [{ text: 'FIRST SHOT:', style: 'productionLabel' }, ''],
        [{ text: 'FIRST MEAL:', style: 'productionLabel' }, ''],
        [{ text: 'FIRST SHOT PM:', style: 'productionLabel' }, ''],
        [{ text: 'SECOND MEAL:', style: 'productionLabel' }, ''],
        [{ text: 'TALENT WRAP:', style: 'productionLabel' }, ''],
        [{ text: 'CAMERA WRAP:', style: 'productionLabel' }, ''],
        [{ text: 'CREW WRAP:', style: 'productionLabel' }, ''],
      ],
    },
    layout: {
      hLineWidth: function (i: number, node: any): number {
        return i === 0 || i === 1 || i === node.table.body?.length ? 1 : 0.5;
      },
      vLineWidth: function (): number {
        return 0.5;
      },
      hLineColor: function (i: number): string {
        return i === 1 ? '#000' : '#aaa';
      },
      vLineColor: function (): string {
        return '#aaa';
      },
      paddingLeft: function (): number {
        return 4;
      },
      paddingRight: function (): number {
        return 4;
      },
      paddingTop: function (): number {
        return 2;
      },
      paddingBottom: function (): number {
        return 2;
      },
    },
  };

  //-- create separate arrays for regular department tables and entity tables.
  const regularDepartmentTables: any[] = [];
  const clientTables: any[] = [];
  const agencyTables: any[] = [];
  const talentTables: any[] = [];
  const vendorTables: any[] = [];

  //-- create an array to collect all vendor rows for combining into a single table.
  const allVendorRows: any[] = [];

  //-- identify entity tables and modify them to use the entity type as the header.
  departmentTables.forEach((table) => {
    const deptName = table.table.body[0][0].text;

    //-- check if this department is really an entity.
    const isProductionEntity =
      options.sheetData.production_entity && deptName === options.sheetData.production_entity.name.toUpperCase();

    const isAgencyEntity =
      options.sheetData.agency_entity && deptName === options.sheetData.agency_entity.name.toUpperCase();

    const isClientEntity =
      options.sheetData.client_entity && deptName === options.sheetData.client_entity.name.toUpperCase();

    const isVendorEntity =
      options.sheetData.vendor_entities && 
      options.sheetData.vendor_entities.length &&
      options.sheetData.vendor_entities.some(
        (entity: CompanyEntityType) => entity.name && deptName === entity.name.toUpperCase(),
      );

    //-- find the vendor entity if this is a vendor entity table.
    const vendorEntity = isVendorEntity
      ? options.sheetData.vendor_entities.find(
          (entity: CompanyEntityType) => entity.name && deptName === entity.name.toUpperCase(),
        )
      : null;

    if (isClientEntity || isAgencyEntity || isVendorEntity) {
      //-- modify the header to use the entity type when it's an entity table.
      const entityType = isClientEntity ? 'CLIENT' : isAgencyEntity ? 'AGENCY' : 'VENDOR';

      //-- replace the entity name with the entity type in the header.
      table.table.body[0][0].text = entityType;

      //-- REMARK: probably a better way to do this.
      //-- remove any font size adjustment that was applied based on the original department name length.
      //@ts-ignore
      if (table.table.body[0][0].fontSize) delete table.table.body[0][0].fontSize;

      //-- for vendor entities, replace the crew's position with the entity.subtype in the first column.
      if (isVendorEntity && vendorEntity && vendorEntity.type) {
        //-- skip the header row (index 0) and update all other rows.
        for (let i = 1; i < (table.table.body ? table.table.body.length : 0); i++) {
          if (table.table.body[i][0] && table.table.body[i][0].text !== undefined) {
            table.table.body[i][0].text = vendorEntity.subtype;

            //-- add the row to allVendorRows with the subtype for later sorting.
            allVendorRows.push({
              row: table.table.body[i],
              subtype: vendorEntity.subtype,
            });
          }
        }
      }

      //-- sort tables into their respective arrays.
      if (isClientEntity) {
        clientTables.push(table);
      } else if (isAgencyEntity) {
        agencyTables.push(table);
      } else if (isVendorEntity) {
        // vendorTables.push(table);
      }
    } else if (!isProductionEntity) {
      //-- check if this is a talent department table.
      const isTalentDepartment = deptName.toUpperCase() === 'TALENT';

      if (isTalentDepartment) {
        talentTables.push(table);
      } else {
        regularDepartmentTables.push(table);
      }
    }
  });

  //-- if we have vendor rows, create a single combined vendor table with the rows sorted by entity.subtype.
  if (allVendorRows && allVendorRows.length > 0) {
    //-- sort vendor rows by subtype alphabetically.
    allVendorRows.sort((a, b) => {
      return a.subtype.localeCompare(b.subtype);
    });

    //-- create a single vendor table with all the sorted rows.
    const combinedVendorTable = {
      table: {
        headerRows: 1,
        widths: ['18%', '18%', '15%', '25%', '12%', '12%'],
        body: [
          [
            {
              text: 'VENDOR',
              style: 'tableHeader',
              alignment: 'left',
            },
            {
              text: 'NAME',
              style: 'tableHeader',
            },
            {
              text: 'PHONE',
              style: 'tableHeader',
            },
            {
              text: 'EMAIL',
              style: 'tableHeader',
            },
            {
              text: 'CALL',
              style: 'tableHeader',
            },
            {
              text: 'WRAP',
              style: 'tableHeader',
            },
          ],
          //-- add all the sorted vendor rows.
          ...allVendorRows.map((item) => item.row),
        ],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 0.5,
        hLineColor: (i: number) => (i === 1 ? '#000' : '#aaa'),
        vLineColor: () => '#aaa',
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
    };

    //-- add the combined vendor table to the vendorTables array.
    vendorTables.push(combinedVendorTable);
  }

  //-- create the final crew table content with regular tables first, then entity tables in the order: client -> agency -> talent -> vendors.
  const crewTableContent = [
    ...regularDepartmentTables,
    ...clientTables,
    ...agencyTables,
    ...talentTables,
    ...vendorTables,
  ];

  crewTableContent.push(productionReportTable as any);

  //-- only add notes table if there are notes.
  if (options.sheetData.notes_and_instructions && options.sheetData.notes_and_instructions?.length > 0) {
    crewTableContent.push(notesTable as any);
  }

  options.sheetData?.agreement && crewTableContent.push(agreementTable as any);

  switch (options?.options?.template) {
    case 'clsc':
      return clsc({ sheetData: options.sheetData, options: options.options }, crewTableContent);

    case 'advd':
      return advd({ sheetData: options.sheetData, options: options.options }, crewTableContent);

    case 'mdrn':
      return mdrn({ sheetData: options.sheetData, options: options.options }, crewTableContent);

    case 'bsct':
      // return bsct({sheetData: options.sheetData, options: options.options}, crewTableContent);
      return;

    default:
      return;
  }
};
