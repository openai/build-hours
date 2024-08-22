schema_dict = {
    "Free_Cash_Flow_Reconciliation": {
        "type": "json_schema",
            "json_schema": {
                "name": "Free_Cash_Flow_Reconciliation",
                "schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "report_date": {"type": "string"},
                        "data": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "quarter": {"type": "string"},
                                    "operating_cash_flow": {"type": "number"},
                                    "purchases_of_property_and_equipment": {"type": "number"},
                                    "free_cash_flow": {"type": "number"}
                                },
                                "required": ["quarter", "operating_cash_flow", "purchases_of_property_and_equipment", "free_cash_flow"],
                                "additionalProperties": False
                            }
                        }
                    },
                    "required": ["report_date", "data", "title"],
                    "additionalProperties": False
                },
                "strict": False
            }
    },
    
    "Free_Cash_Flow_Less_Principal_Repayments": {
        "type": "json_schema",
        "json_schema": {
            "name": "Free_Cash_Flow_Less_Principal_Repayments",
            "schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "report_date": {"type": "string"},
                    "data": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "quarter": {"type": "string"},
                                "operating_cash_flow": {"type": "number"},
                                "purchases_of_property_and_equipment": {"type": "number"},
                                "principal_repayments_of_finance_leases": {"type": "number"},
                                "principal_repayments_of_financing_obligations": {"type": "number"},
                                "free_cash_flow_less_principal_repayments": {"type": "number"}
                            },
                            "required": [
                                "quarter",
                                "operating_cash_flow",
                                "purchases_of_property_and_equipment",
                                "principal_repayments_of_finance_leases",
                                "principal_repayments_of_financing_obligations",
                                "free_cash_flow_less_principal_repayments"
                            ],
                            "additionalProperties": False
                        }
                    }
                },
                "required": ["report_date", "title", "data"],
                "additionalProperties": False
            },
            "strict": False
        }
    },
    
    "Free_Cash_Flow_Less_Equipment_Finance_Leases": {
        "type": "json_schema",
        "json_schema": {
            "name": "Free_Cash_Flow_Less_Equipment_Finance_Leases",
            "schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "report_date": {"type": "string"},
                    "data": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "quarter": {"type": "string"},
                                "operating_cash_flow": {"type": "number"},
                                "purchases_of_property_and_equipment": {"type": "number"},
                                "equipment_acquired_under_finance_leases": {"type": "number"},
                                "principal_repayments_of_other_finance_leases": {"type": "number"},
                                "principal_repayments_of_financing_obligations": {"type": "number"},
                                "free_cash_flow_less_equipment_finance_leases": {"type": "number"}
                            },
                            "required": [
                                "quarter",
                                "operating_cash_flow",
                                "purchases_of_property_and_equipment",
                                "equipment_acquired_under_finance_leases",
                                "principal_repayments_of_other_finance_leases",
                                "principal_repayments_of_financing_obligations",
                                "free_cash_flow_less_equipment_finance_leases"
                            ],
                            "additionalProperties": False
                        }
                    },
                },
                "required": ["report_date", "title", "data"],
                "additionalProperties": False
            },
            "strict": False
        }
    }
}