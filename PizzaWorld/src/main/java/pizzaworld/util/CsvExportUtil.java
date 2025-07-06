package pizzaworld.util;

import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.util.List;

public class CsvExportUtil {

    public static void writeCsv(HttpServletResponse response, List<String> headers, List<List<String>> rows, String filename) {
        try {
            response.setContentType("text/csv");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

            PrintWriter writer = response.getWriter();

            // Schreibe Header
            writer.println(String.join(",", headers));

            // Schreibe Datenzeilen
            for (List<String> row : rows) {
                writer.println(String.join(",", row));
            }

            writer.flush();
            writer.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
