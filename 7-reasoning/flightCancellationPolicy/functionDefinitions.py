TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "verify_identity",
            "description": "Verifies the customer's identity using booking reference, full name, and flight number.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    },
                    "full_name": {
                        "type": "string",
                        "description": "Customer's full name."
                    },
                    "flight_number": {
                        "type": "string",
                        "description": "Flight number."
                    }
                },
                "required": ["booking_reference", "full_name", "flight_number"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ask_clarification",
            "description": "Prompts the customer for clarification on their request.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The prompt to ask the customer."
                    }
                },
                "required": ["prompt"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_ticket_type",
            "description": "Retrieves the type of ticket (non-refundable, refundable, flexible) based on the booking reference.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    }
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "process_full_refund",
            "description": "Processes a full refund to the original payment method.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    }
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_fare_rules",
            "description": "Retrieves specific fare rules to determine applicable refund amounts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    }
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "process_partial_refund",
            "description": "Processes a partial refund based on fare rules.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    },
                    "refund_amount": {
                        "type": "number",
                        "description": "The amount to refund."
                    }
                },
                "required": ["booking_reference", "refund_amount"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "offer_flight_credit",
            "description": "Offers flight credit for future use, subject to an administration fee.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    }
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "rebook_without_fee",
            "description": "Rebooks the customer on the next available flight without additional charges.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    }
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "prioritize_rebooking",
            "description": "Gives affected customers priority for rebooking.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    }
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "offer_accommodation",
            "description": "Offers hotel accommodation to the customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "Customer's booking reference."
                    }
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "process_change_no_fee",
            "description": "Processes flight changes without any fees, subject to availability.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_change_fee",
            "description": "Applies necessary change fees and any fare differences.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_standard_change_fee",
            "description": "Applies the standard change fee for changes within 7 days of departure.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_lesser_change_fee",
            "description": "Applies a lesser or no change fee based on ticket type for changes beyond 7 days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "provide_alternative_options",
            "description": "Provides alternative flight options to the customer upon request.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    # Functions related to rebooking
    {
        "type": "function",
        "function": {
            "name": "check_next_available_flight",
            "description": "Retrieves the next available flight operated by our airline.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_flight",
            "description": "Books the customer on the specified flight.",
            "parameters": {
                "type": "object",
                "properties": {
                    "flight_details": {"type": "string", "description": "Details of the flight to book."}
                },
                "required": ["flight_details"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_interline_partners",
            "description": "Checks interline partners for alternative flight connections.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_interline_flight",
            "description": "Books the customer on an interline partner's flight.",
            "parameters": {
                "type": "object",
                "properties": {
                    "interline_flight": {"type": "string", "description": "Details of the interline partner flight."}
                },
                "required": ["interline_flight"],
                "additionalProperties": False
            }
        }
    },
    # Functions related to refunds and compensation
    {
        "type": "function",
        "function": {
            "name": "determine_refund_method",
            "description": "Determines whether to refund to the original payment method or offer travel credits.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "process_refund",
            "description": "Processes the refund to the original payment method.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."},
                    "original_payment_method": {"type": "string", "description": "Original payment method used."}
                },
                "required": ["booking_reference", "original_payment_method"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_travel_credit",
            "description": "Applies travel credits to the customer's account with a bonus percentage incentive.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."},
                    "bonus_percentage": {"type": "number", "description": "Bonus percentage to apply to the travel credit."}
                },
                "required": ["booking_reference", "bonus_percentage"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_compensation_eligibility",
            "description": "Determines the customer's eligibility for compensation based on various factors.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    # Functions for special circumstances
    {
        "type": "function",
        "function": {
            "name": "process_flexible_cancellation",
            "description": "Processes full cancellation or flight credit without fees upon receiving a medical certificate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."},
                    "medical_certificate": {"type": "string", "description": "Medical certificate provided by the customer."}
                },
                "required": ["booking_reference", "medical_certificate"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "waive_change_fees",
            "description": "Waives change fees due to medical emergencies or military orders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."},
                    "documentation": {"type": "string", "description": "Relevant documentation provided by the customer."}
                },
                "required": ["booking_reference", "documentation"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_bereavement_flexibility",
            "description": "Offers flexibility on cancellations or changes for bereavement cases.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."},
                    "bereavement_documentation": {"type": "string", "description": "Bereavement documentation provided by the customer."}
                },
                "required": ["booking_reference", "bereavement_documentation"],
                "additionalProperties": False
            }
        }
    },
    # Functions for group bookings
    {
        "type": "function",
        "function": {
            "name": "process_partial_group_cancellation",
            "description": "Allows individual cancellations within a group booking.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Group booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "permit_name_change",
            "description": "Permits one name change per passenger at no additional cost if made 7+ days before departure.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Booking reference."},
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    # Functions for unaccompanied minors
    {
        "type": "function",
        "function": {
            "name": "arrange_supervision",
            "description": "Ensures proper supervision is arranged for flight changes involving unaccompanied minors.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Booking reference of the unaccompanied minor."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "prioritize_minors_rebooking",
            "description": "Prioritizes rebooking for unaccompanied minors on the next available flight.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Booking reference of the unaccompanied minor."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    # Functions for handling FAQs
    {
        "type": "function",
        "function": {
            "name": "prioritize_missed_connections",
            "description": "Rebooks customers on missed connections caused by airline delays without additional fees.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "offer_available_upgrades",
            "description": "Offers available upgrades based on fare class availability.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "process_destination_change",
            "description": "Allows changes to a different destination, applying any fare differences and change fees.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."},
                    "new_destination": {"type": "string", "description": "New destination requested by the customer."}
                },
                "required": ["booking_reference", "new_destination"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assist_third_party_booking",
            "description": "Assists with third-party bookings if eligible for direct airline handling.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Third-party booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assess_compensation_request",
            "description": "Evaluates the customer's compensation request based on airline policy.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."}
                },
                "required": ["booking_reference"],
                "additionalProperties": False
            }
        }
    },
    # Final case resolution function
    {
        "type": "function",
        "function": {
            "name": "case_resolution",
            "description": "Finalizes and closes the customer case with all resolution details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Customer's booking reference."},
                    "resolution_details": {"type": "string", "description": "Details of how the case was resolved."}
                },
                "required": ["booking_reference", "resolution_details"],
                "additionalProperties": False
            }
        }
    }
]