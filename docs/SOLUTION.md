Problem

Our HVAC technicians are losing time on every service call.

Right now when a tech gets to a job site and needs to give the customer an estimate, here’s what happens: they flip through a product binder or scroll through a spreadsheet on their phone, look up equipment costs, try to remember labor rates for different job types, factor in the specifics of the property, and then scribble numbers on a notepad or punch them into a calculator. Sometimes they call the office to double-check pricing. Sometimes they guess and adjust later.

The customer is standing there the whole time. 

A simple repair estimate might take 10-15 minutes. A full system replacement quote can take 30-45 minutes on-site, and that’s before the tech has to go back to their truck to write it up in a way the customer can actually read. Some techs text a photo of their handwritten notes to the office and have someone there type it up. Others just wing it and send a “real” estimate later that evening. 

We’ve got about 40 technicians in the field. If each one does 4-6 estimates a day, that’s a lot of wasted time – and a lot of customers standing around waiting. We’ve heard from customers that the wait makes the whole experience feel less professional and we’ve definitely lost jobs because a competitor got a clean estimate out faster.

Solution

For this assessment problem, I wanted to create an application that addresses the time technicians spend gathering equipment information, calculating labor costs, and preparing estimates after inspecting a customer's HVAC system.
My solution, is a mobile-first estimating application designed to help technicians create itemized estimates directly from the field, rather than relying on handwritten notes or waiting for the office to prepare them.
The application allows technicians to document their inspection findings, search equipment and labor catalogs, and generate an estimated cost for the proposed work. I also incorporated an AI-assisted recommendation system to help technicians identify potentially relevant equipment and labor based on the information collected during an inspection.
AI recommendations are not automatically added to the estimate. The technician must review and approve each recommendation, ensuring that the final selection remains under their control. Pricing is calculated using the supplied catalog data rather than AI-generated figures, and final customer pricing still requires business verification.
Technician Workflow
I designed the application around a straightforward workflow that technicians could use on a phone or tablet while visiting a customer's property.
1. Select or add a property
The technician begins by selecting an existing customer and property or adding a new customer if they receive a service request while in the field.
2. Document the inspection
The technician records observations about the HVAC system, reported customer concerns, equipment condition, and other relevant information. Existing system information can also help populate parts of the inspection.
3. Build the estimate
The technician can manually search for equipment and labor or request AI-assisted recommendations based on the inspection findings.
Each AI recommendation includes an explanation and requires technician approval before being added. Technicians can also adjust equipment quantities and estimated labor hours, with costs recalculated automatically.
4. Review and present the estimate
Once the technician has selected the necessary items, the application generates an itemized estimate showing the proposed scope of work and estimated costs.
The technician can review and edit the information before presenting it to the customer, then print or save the estimate.
My goal with this workflow was to reduce repetitive manual work, make pricing information easier to access, and streamline communication between field technicians, customers, and the office.
What I Would Improve With More Time
If I were to continue developing this solution, my next priority would be integrating a centralized database so technicians and office employees could access the same customer records, estimates, and service history across multiple devices.
I would also introduce an office review workflow. When a technician submits an estimate, the office would receive a notification, review the proposed services and pricing, and approve the estimate before it is sent to the customer.
Another improvement would be automatic PDF generation. Rather than manually preparing an estimate document, the application could generate a professional, itemized PDF containing the proposed work, equipment, labor, costs, and explanations. Once approved, office staff could send it to customers through email or text message.
Finally, I would continue improving the AI recommendation system by incorporating additional equipment specifications, historical service data, and technician feedback. This could make recommendations more useful while preserving technician approval and preventing the system from making unsupported diagnoses or pricing decisions.
Ultimately, my vision is to develop this solution into a shared workflow between field technicians and office staff, reducing repetitive administrative work while maintaining accuracy, transparency, and human oversight.
