// const epress = require('express');
// const app=express();
// const port=3000;
// app.get('/',(req,res)=>{
//     res.send('Hello World!');
// });
// app.post('/',(req,res)=>{
//     res.send('Hello World from post!');
// });
// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}/`);
// });
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
let employees = [];
function showMenu() {
  console.log("\n=== Employee Management System ===");
  console.log("1. Add Employee");
  console.log("2. List Employees");
  console.log("3. Remove Employee by ID");
  console.log("4. Exit");

  rl.question("Choose an option (1-4): ", (choice) => {
    switch (choice) {
      case "1":
        addEmployee();
        break;
      case "2":
        listEmployees();
        break;
      case "3":
        removeEmployee();
        break;
      case "4":
        console.log("Exiting... Goodbye!");
        rl.close();
        break;
      default:
        console.log("Invalid choice. Please try again.");
        showMenu();
    }
  });
}
function addEmployee() {
  rl.question("Enter Employee ID: ", (id) => {
 
    if (employees.some(emp => emp.id === id)) {
      console.log("❌ Employee with this ID already exists!");
      return showMenu();
    }

    rl.question("Enter Employee Name: ", (name) => {
      employees.push({ id, name });
      console.log(`✅ Employee ${name} added successfully!`);
      showMenu();
    });
  });
}
function listEmployees() {
  if (employees.length === 0) {
    console.log("⚠️ No employees found!");
  } else {
    console.log("\n--- Employee List ---");
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ID: ${emp.id}, Name: ${emp.name}`);
    });
  }
  showMenu();
} 
function removeEmployee() {
  rl.question("Enter Employee ID to remove: ", (id) => {
    const index = employees.findIndex(emp => emp.id === id);

    if (index === -1) {
      console.log("❌ Employee not found!");
    } else {
      const removed = employees.splice(index, 1);
      console.log(`🗑️ Employee ${removed[0].name} removed successfully!`);
    }
    showMenu();
  });
}
showMenu();
