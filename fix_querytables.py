"""Converte as 4 tabelas PQ_ de tableType='queryTable' (que apontam para uma
conexão Power Query removida pelo openpyxl) em tabelas normais. Essa órfã é a
causa do aviso de recuperação do Excel."""
from openpyxl import load_workbook

PATH = 'NEC_Eventos_Reestruturado_v4.xlsx'
wb = load_workbook(PATH)

fixed = 0
for ws in wb.worksheets:
    for tbl in ws.tables.values():
        if tbl.tableType is not None or tbl.displayName.startswith('PQ_'):
            tbl.tableType = None                 # remove tableType="queryTable"
            for col in tbl.tableColumns:
                col.queryTableFieldId = None     # remove queryTableFieldId
                col.uniqueName = None            # limpa atributo de query
            fixed += 1
            print(f"  Convertida tabela normal: {tbl.displayName} ({ws.title})")

wb.save(PATH)
print(f"✅ {fixed} tabelas queryTable convertidas em normais")
