package pizzaworld.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Super-light retrieval helper that loads a markdown file from classpath
 * (src/main/resources/knowledge/faq.md) and returns the first section whose
 * text contains all query keywords.
 * No embeddings, no database – perfect for a quick proof-of-concept.
 */
@Component
public class StaticDocRetriever {

    private record DocChunk(String title, String content) {}

    private final List<DocChunk> chunks;

    public StaticDocRetriever() {
        this.chunks = loadChunks();
    }

    private List<DocChunk> loadChunks() {
        List<DocChunk> allChunks = new ArrayList<>();
        
        // Load FAQ knowledge
        allChunks.addAll(loadKnowledgeFile("knowledge/faq.md"));
        
        // Load business operations knowledge
        allChunks.addAll(loadKnowledgeFile("knowledge/business-operations.md"));
        
        // Load technical system guide
        allChunks.addAll(loadKnowledgeFile("knowledge/technical-guide.md"));
        
        return allChunks;
    }
    
    private List<DocChunk> loadKnowledgeFile(String filePath) {
        try {
            ClassPathResource res = new ClassPathResource(filePath);
            if (!res.exists()) return List.of();

            List<String> lines = new BufferedReader(new InputStreamReader(res.getInputStream(), StandardCharsets.UTF_8))
                    .lines()
                    .collect(Collectors.toList());

            List<DocChunk> list = new ArrayList<>();
            StringBuilder sb = new StringBuilder();
            String currentTitle = null;
            for (String line : lines) {
                if (line.startsWith("## ")) {
                    // flush previous
                    if (currentTitle != null) {
                        list.add(new DocChunk(currentTitle, sb.toString().trim()));
                    }
                    currentTitle = line.substring(3).trim();
                    sb.setLength(0);
                } else {
                    sb.append(line).append("\n");
                }
            }
            if (currentTitle != null) {
                list.add(new DocChunk(currentTitle, sb.toString().trim()));
            }
            return list;
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * More flexible keyword match. Finds the chunk with the most keyword hits
     * and returns it if it meets a minimum threshold.
     */
    public Optional<String> findMatch(String query) {
        if (query == null || query.isBlank() || chunks.isEmpty()) return Optional.empty();

        String[] keywords = Arrays.stream(query.toLowerCase().split("\\s+"))
                .distinct()
                .toArray(String[]::new);

        if (keywords.length == 0) return Optional.empty();

        DocChunk bestMatch = null;
        int maxHits = 0;

        for (DocChunk chunk : chunks) {
            String searchableContent = (chunk.title() + " " + chunk.content()).toLowerCase();
            int currentHits = 0;
            for (String keyword : keywords) {
                if (searchableContent.contains(keyword)) {
                    currentHits++;
                }
            }

            if (currentHits > maxHits) {
                maxHits = currentHits;
                bestMatch = chunk;
            }
        }

        // Require at least half the keywords to match, or 1 if query is short
        int threshold = Math.max(1, keywords.length / 2);

        if (maxHits >= threshold) {
            return Optional.of(bestMatch.title() + "\n" + bestMatch.content());
        }

        return Optional.empty();
    }
}
