import os
import json
import sqlite3


def create_tables(cursor):
    """
    Create tables for Free Cash Flow data.
    """
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Free_Cash_Flow_Less_Equipment_Finance_Leases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT,
        quarter TEXT,
        operating_cash_flow REAL,
        purchases_of_property_and_equipment REAL,
        equipment_acquired_under_finance_leases REAL,
        principal_repayments_of_other_finance_leases REAL,
        principal_repayments_of_financing_obligations REAL,
        free_cash_flow_less_equipment_finance_leases REAL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Free_Cash_Flow_Less_Principal_Repayments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT,
        quarter TEXT,
        operating_cash_flow REAL,
        purchases_of_property_and_equipment REAL,
        principal_repayments_of_finance_leases REAL,
        principal_repayments_of_financing_obligations REAL,
        free_cash_flow_less_principal_repayments REAL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Free_Cash_Flow_Reconciliation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT,
        quarter TEXT,
        operating_cash_flow REAL,
        purchases_of_property_and_equipment REAL,
        free_cash_flow REAL
    )
    ''')


def ingest_json_files(json_folder_path, db_path):
    """
    Ingest JSON files into the SQLite database.
    """
    # Connect to the SQLite3 database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create tables
    create_tables(cursor)

    # Loop over all JSON files in the specified folder
    for filename in os.listdir(json_folder_path):
        if filename.endswith(".json"):
            file_path = os.path.join(json_folder_path, filename)

            # Load the JSON data
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            title = data.get("title")
            report_date = data.get("report_date")
            records = data.get("data", [])

            if title == "Free_Cash_Flow_Less_Equipment_Finance_Leases":
                for record in records:
                    cursor.execute('''
                    INSERT INTO Free_Cash_Flow_Less_Equipment_Finance_Leases (
                        report_date,
                        quarter,
                        operating_cash_flow,
                        purchases_of_property_and_equipment,
                        equipment_acquired_under_finance_leases,
                        principal_repayments_of_other_finance_leases,
                        principal_repayments_of_financing_obligations,
                        free_cash_flow_less_equipment_finance_leases
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        report_date,
                        record.get("quarter"),
                        record.get("operating_cash_flow"),
                        record.get("purchases_of_property_and_equipment"),
                        record.get("equipment_acquired_under_finance_leases"),
                        record.get(
                            "principal_repayments_of_other_finance_leases"),
                        record.get(
                            "principal_repayments_of_financing_obligations"),
                        record.get(
                            "free_cash_flow_less_equipment_finance_leases")
                    ))
            elif title == "Free_Cash_Flow_Less_Principal_Repayments":
                for record in records:
                    cursor.execute('''
                    INSERT INTO Free_Cash_Flow_Less_Principal_Repayments (
                        report_date,
                        quarter,
                        operating_cash_flow,
                        purchases_of_property_and_equipment,
                        principal_repayments_of_finance_leases,
                        principal_repayments_of_financing_obligations,
                        free_cash_flow_less_principal_repayments
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        report_date,
                        record.get("quarter"),
                        record.get("operating_cash_flow"),
                        record.get("purchases_of_property_and_equipment"),
                        record.get("principal_repayments_of_finance_leases"),
                        record.get(
                            "principal_repayments_of_financing_obligations"),
                        record.get("free_cash_flow_less_principal_repayments")
                    ))
            elif title == "Free_Cash_Flow_Reconciliation":
                for record in records:
                    cursor.execute('''
                    INSERT INTO Free_Cash_Flow_Reconciliation (
                        report_date,
                        quarter,
                        operating_cash_flow,
                        purchases_of_property_and_equipment,
                        free_cash_flow
                    ) VALUES (?, ?, ?, ?, ?)
                    ''', (
                        report_date,
                        record.get("quarter"),
                        record.get("operating_cash_flow"),
                        record.get("purchases_of_property_and_equipment"),
                        record.get("free_cash_flow")
                    ))
            else:
                print(
                    f"Unknown title '{title}' in file '{filename}'. Skipping.")

    # Commit changes and close connection
    conn.commit()
    conn.close()


def execute_query(db_path, query, params=()):
    """
    Execute a SQL query and return the results.

    Parameters:
    db_path (str): Path to the SQLite database file.
    query (str): SQL query to be executed.
    params (tuple): Parameters to be passed to the query (default is an empty tuple).

    Returns:
    list: List of rows returned by the query.
    """
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Execute the query with parameters
        cursor.execute(query, params)
        results = cursor.fetchall()

        # Commit if it's an INSERT/UPDATE/DELETE query
        if query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
            conn.commit()

        return results
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        return []
    finally:
        # Close the connection
        if conn:
            conn.close()


# Example usage
if __name__ == "__main__":
    json_folder_path = "./table_json"
    db_path = "earnings.db"

    # Ingest JSON files into the database
    ingest_json_files(json_folder_path, db_path)

    # Example query: Retrieve all records from Free_Cash_Flow_Reconciliation where free_cash_flow > 25000
    query = '''
    SELECT
        DISTINCT
        quarter,
        operating_cash_flow,
        purchases_of_property_and_equipment,
        free_cash_flow
    FROM
        Free_Cash_Flow_Reconciliation
    WHERE
        free_cash_flow > ?
    '''
    results = execute_query(db_path, query, (25700,))

    for row in results:
        print(row)
